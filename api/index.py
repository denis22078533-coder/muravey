"""FastAPI backend for Babki Scan — Vercel serverless (stateless) with PostgreSQL."""
import json
import io
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum
import httpx

# Инициализация БД при холодном старте
from database import init_db, get_operations, save_operation, get_settings, save_settings, get_reports, save_report

init_db()

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


def upload_to_s3(endpoint: str, access_key: str, secret_key: str, bucket: str, image_bytes: bytes) -> str | None:
    """Загружает изображение в S3. При ошибке — None."""
    try:
        import boto3
        from botocore.client import Config
        host = endpoint.removeprefix("https://").removeprefix("http://")
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
        return f"https://{bucket}.{host}/{key}"
    except Exception:
        return None


# --- Models ---
class ScanRequest(BaseModel):
    image: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class OperationPayload(BaseModel):
    id: str = ""
    date: str
    place: str = ""
    total: float = 0
    type: str = "expense"
    items: list[dict] = []
    raw_text: str = ""

class SettingsPayload(BaseModel):
    proxyapi_key: str = ""
    deepseek_key: str = ""
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = ""
    tariff: str = "free"
    sbp_tbank_key: str = ""
    sbp_merchant_id: str = ""

class ReportPayload(BaseModel):
    id: str = ""
    date: str
    period: str
    status: str = "Готов"


# --- Routes ---

@app.get("/api/operations")
async def list_operations(request: Request):
    return get_operations("default")

@app.post("/api/operations")
async def add_operation(payload: OperationPayload):
    import uuid as _uuid
    op = {**payload.model_dump(), "id": payload.id or _uuid.uuid4().hex}
    save_operation(op)
    return {"ok": True}

@app.get("/api/settings")
async def read_settings():
    return get_settings()

@app.post("/api/settings")
async def write_settings(payload: SettingsPayload):
    data = payload.model_dump()
    save_settings(data)
    return {"ok": True}

@app.get("/api/reports")
async def list_reports(request: Request):
    return get_reports("default")

@app.post("/api/reports")
async def add_report(payload: ReportPayload):
    import uuid as _uuid
    entry = {**payload.model_dump(), "id": payload.id or _uuid.uuid4().hex}
    save_report(entry)
    return {"ok": True}

@app.post("/api/scan")
async def scan_receipt(req: ScanRequest, request: Request):
    proxyapi_key = get_header(request, "X-ProxyAPI-Key")
    if not proxyapi_key:
        return {"error": "X-ProxyAPI-Key header is missing or empty"}
    image_data = req.image
    if not image_data:
        return {"error": "No image data provided"}
    try:
        import base64
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return {"error": "Invalid base64 image"}

    s3_cfg = get_settings()
    image_url: str | None = None
    if s3_cfg.get("s3_endpoint") and s3_cfg.get("s3_access_key"):
        image_url = upload_to_s3(
            s3_cfg["s3_endpoint"], s3_cfg["s3_access_key"],
            s3_cfg["s3_secret_key"], s3_cfg["s3_bucket"], image_bytes,
        )
    if image_url is None:
        image_url = f"data:image/jpeg;base64,{image_data}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://proxyapi.ru/chat/completions",
                headers={"Authorization": f"Bearer {proxyapi_key}", "Content-Type": "application/json"},
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": (
                                "Ты бухгалтерский ассистент. Распознай этот кассовый чек. "
                                "Верни ТОЛЬКО JSON (без markdown) с полями: place, date (ДД.ММ.ГГГГ), "
                                "items (массив с name, quantity, price, sum, category), total, raw_text. "
                                "Категории: Продукты, Рестораны, Авто, ЖКХ, Услуги, Прочее."
                            )},
                            {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}},
                        ],
                    }],
                    "max_tokens": 2000, "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}").strip()
                if content.startswith("```"): content = content.split("\n", 1)[-1].removesuffix("```")
                return json.loads(content)
            else:
                return {"error": f"ProxyAPI {resp.status_code}", "raw_text": ""}
    except httpx.TimeoutException:
        return {"error": "ProxyAPI timeout", "raw_text": ""}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}", "raw_text": ""}
    except Exception as e:
        return {"error": f"Scan error: {str(e)[:200]}", "raw_text": ""}

@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    deepseek_key = get_header(request, "X-DeepSeek-Key")
    if not deepseek_key:
        return {"error": "X-DeepSeek-Key header is missing or empty"}
    if not req.messages:
        return {"error": "No messages provided"}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"},
                json={"model": "deepseek-chat", "messages": [m.model_dump() for m in req.messages], "max_tokens": 1500, "temperature": 0.7},
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"reply": data.get("choices", [{}])[0].get("message", {}).get("content", "")}
            else:
                return {"error": f"DeepSeek {resp.status_code}"}
    except httpx.TimeoutException:
        return {"error": "DeepSeek timeout"}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}"}
    except Exception as e:
        return {"error": f"Chat error: {str(e)[:200]}"}