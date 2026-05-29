"""FastAPI backend for Babki Scan — Vercel serverless (stateless) with S3 support."""
import json
import io
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum
import httpx

app = FastAPI(title="Babki Scan API")
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_header(request: Request, name: str, fallback: str = "") -> str:
    for key, value in request.headers.items():
        if key.lower() == name.lower():
            return value
    return fallback


def upload_to_s3(
    endpoint: str,
    access_key: str,
    secret_key: str,
    bucket: str,
    image_bytes: bytes,
) -> str | None:
    """Загружает изображение в S3 и возвращает публичный URL. При ошибке — None."""
    try:
        import boto3
        from botocore.client import Config

        # Формируем endpoint без протокола если нужно
        if endpoint.startswith("https://"):
            endpoint_host = endpoint[8:]
        elif endpoint.startswith("http://"):
            endpoint_host = endpoint[7:]
        else:
            endpoint_host = endpoint

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint if endpoint.startswith("http") else f"https://{endpoint}",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="ru-central1",
        )

        key = f"receipts/{uuid.uuid4().hex}.jpg"
        s3.upload_fileobj(io.BytesIO(image_bytes), bucket, key, ExtraArgs={"ContentType": "image/jpeg"})

        # Формируем публичный URL
        return f"https://{bucket}.{endpoint_host}/{key}"
    except Exception:
        return None


# --- Models ---

class ScanRequest(BaseModel):
    image: str  # base64-encoded image data


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


# --- Routes ---

@app.post("/api/scan")
async def scan_receipt(req: ScanRequest, request: Request):
    """
    Распознаёт чек через ProxyAPI.
    Если переданы S3-заголовки — загружает в S3 и передаёт URL вместо base64.
    Категоризирует каждый товар.
    """
    proxyapi_key = get_header(request, "X-ProxyAPI-Key")
    if not proxyapi_key:
        return {"error": "X-ProxyAPI-Key header is missing or empty"}

    image_data = req.image
    if not image_data:
        return {"error": "No image data provided"}

    # Декодируем изображение
    try:
        import base64
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return {"error": "Invalid base64 image"}

    # Пытаемся загрузить в S3
    s3_endpoint = get_header(request, "X-S3-Endpoint")
    s3_access = get_header(request, "X-S3-Access-Key")
    s3_secret = get_header(request, "X-S3-Secret-Key")
    s3_bucket = get_header(request, "X-S3-Bucket")

    image_url: str | None = None
    if s3_endpoint and s3_access and s3_secret and s3_bucket:
        s3_url = upload_to_s3(s3_endpoint, s3_access, s3_secret, s3_bucket, image_bytes)
        if s3_url:
            image_url = s3_url

    # Если S3 не сработал — используем base64
    if image_url is None:
        image_url = f"data:image/jpeg;base64,{image_data}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://proxyapi.ru/chat/completions",
                headers={
                    "Authorization": f"Bearer {proxyapi_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "Ты бухгалтерский ассистент. Распознай этот кассовый чек. "
                                        "Верни ТОЛЬКО JSON (без markdown-разметки) с полями:\n"
                                        "- place (string): название магазина\n"
                                        "- date (string): дата в формате ДД.ММ.ГГГГ\n"
                                        "- items (array): список позиций, каждая с полями:\n"
                                        "  name (string), quantity (number), price (number за единицу), "
                                        "sum (number), category (string: одна из: Продукты, Рестораны, Авто, ЖКХ, Услуги, Прочее)\n"
                                        "- total (number): итоговая сумма\n"
                                        "- raw_text (string): сырой текст чека\n"
                                        "Если что-то не ясно — угадай best-effort. "
                                        "Если это не чек — верни {\"error\": \"Это не чек\"}."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_url,
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1]
                    if content.endswith("```"):
                        content = content[:-3]
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    return {"raw_text": content}
            else:
                detail = resp.text[:300]
                return {"error": f"ProxyAPI returned {resp.status_code}: {detail}", "raw_text": ""}
    except httpx.TimeoutException:
        return {"error": "ProxyAPI timeout", "raw_text": ""}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}", "raw_text": ""}
    except Exception as e:
        return {"error": f"Scan error: {str(e)[:200]}", "raw_text": ""}


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    """Чат с DeepSeek V3."""
    deepseek_key = get_header(request, "X-DeepSeek-Key")
    if not deepseek_key:
        return {"error": "X-DeepSeek-Key header is missing or empty"}

    if not req.messages:
        return {"error": "No messages provided"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {deepseek_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [m.model_dump() for m in req.messages],
                    "max_tokens": 1500,
                    "temperature": 0.7,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {"reply": reply}
            else:
                detail = resp.text[:300]
                return {"error": f"DeepSeek API returned {resp.status_code}: {detail}"}
    except httpx.TimeoutException:
        return {"error": "DeepSeek API timeout"}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}"}
    except Exception as e:
        return {"error": f"Chat error: {str(e)[:200]}"}