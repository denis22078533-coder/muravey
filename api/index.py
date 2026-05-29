"""FastAPI backend for Babki Scan — Vercel serverless."""
import json
import os
import base64
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
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

SETTINGS_FILE = Path("/tmp/ai_settings.json")
FALLBACK_SETTINGS_FILE = Path(__file__).parent / "ai_settings.json"


def read_settings() -> dict:
    """Читает настройки из /tmp (primary) или из локального файла."""
    for path in (SETTINGS_FILE, FALLBACK_SETTINGS_FILE):
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                pass
    return {
        "deepseek_api_key": os.getenv("DEEPSEEK_API_KEY", ""),
        "proxyapi_key": os.getenv("PROXYAPI_KEY", ""),
        "s3_endpoint": os.getenv("S3_ENDPOINT", ""),
        "s3_access_key": os.getenv("S3_ACCESS_KEY", ""),
        "s3_secret_key": os.getenv("S3_SECRET_KEY", ""),
        "s3_bucket": os.getenv("S3_BUCKET", ""),
    }


def write_settings(settings: dict) -> None:
    """Сохраняет настройки в /tmp (serverless-safe)."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
    # Также сохраняем локально если возможно
    try:
        FALLBACK_SETTINGS_FILE.write_text(
            json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception:
        pass


# --- Models ---

class SettingsPayload(BaseModel):
    deepseek_api_key: Optional[str] = None
    proxyapi_key: Optional[str] = None
    s3_endpoint: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None
    s3_bucket: Optional[str] = None


class ScanRequest(BaseModel):
    image: str  # base64-encoded image data (without prefix)
    proxyapi_key: str = ""


class ChatRequest(BaseModel):
    messages: list[dict]  # [{"role":"user","content":"..."}]
    deepseek_api_key: str = ""


# --- Routes ---

@app.get("/api/settings")
async def get_settings():
    """Возвращает текущие настройки AI и S3."""
    return read_settings()


@app.post("/api/settings")
async def save_settings(payload: SettingsPayload):
    """Сохраняет настройки AI и S3."""
    current = read_settings()
    update = payload.model_dump(exclude_none=True)
    current.update(update)
    write_settings(current)
    return {"ok": True}


@app.post("/api/scan")
async def scan_receipt(req: ScanRequest):
    """
    Распознаёт чек через ProxyAPI (модель openai/gpt-4o-mini).
    Принимает base64-изображение.
    Если S3 или ProxyAPI недоступны — возвращает Base64 fallback вместо 500.
    """
    proxyapi_key = req.proxyapi_key or read_settings().get("proxyapi_key", "")
    if not proxyapi_key:
        raise HTTPException(status_code=400, detail="PROXYAPI_KEY not configured")

    image_data = req.image
    if not image_data:
        raise HTTPException(status_code=400, detail="No image data provided")

    try:
        # Попытка распознавания через ProxyAPI
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://proxyapi.ru/api/v1/chat/completions",
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
                                        "- items (array): список позиций, каждая с полями name (string), "
                                        "quantity (number), price (number за единицу), sum (number)\n"
                                        "- total (number): итоговая сумма\n"
                                        "- raw_text (string): сырой текст чека\n"
                                        "Если что-то не ясно — угадай best-effort. "
                                        "Если это не чек — верни {\"error\": \"Это не чек\"}."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_data}",
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.1,
                },
            )

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                # Очистка от markdown-разметки
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1]
                    if content.endswith("```"):
                        content = content[:-3]
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    return {"raw_text": content, "error": None}
            else:
                detail = resp.text[:300]
                # Fallback: возвращаем ошибку без 500
                return {"error": f"ProxyAPI returned {resp.status_code}: {detail}", "raw_text": ""}
    except httpx.TimeoutException:
        return {"error": "ProxyAPI timeout", "raw_text": ""}
    except httpx.ConnectError:
        return {"error": "Cannot connect to ProxyAPI", "raw_text": ""}
    except Exception as e:
        return {"error": f"Scan error: {str(e)[:200]}", "raw_text": ""}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Чат с DeepSeek V3 через DEEPSEEK_API_KEY.
    """
    deepseek_key = req.deepseek_api_key or read_settings().get("deepseek_api_key", "")
    if not deepseek_key:
        raise HTTPException(status_code=400, detail="DEEPSEEK_API_KEY not configured")

    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

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
                    "messages": req.messages,
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
                raise HTTPException(
                    status_code=502,
                    detail=f"DeepSeek API returned {resp.status_code}: {detail}",
                )
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="DeepSeek API timeout")
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to DeepSeek API")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)[:200]}")