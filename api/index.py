"""FastAPI backend for Babki Scan — SFTP + SQLite on remote VPS."""
import json
import io
import uuid
import sqlite3
import tempfile
import os
from datetime import datetime

from fastapi import FastAPI, Request, Response
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


def get_sftp_connection(request: Request):
    """SFTP-подключение к VPS через paramiko. Возвращает (sftp, temp_dir) или (None, None)."""
    host = get_header(request, "X-Server-Host")
    user = get_header(request, "X-Server-User", "root")
    password = get_header(request, "X-Server-Password")
    db_path = get_header(request, "X-Server-DB-Path", "/root/my-project-storage/babki.db")

    if not host or not password:
        return None, None, None

    try:
        import paramiko
        transport = paramiko.Transport((host, 22))
        transport.connect(username=user, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)

        # Скачиваем БД во временный файл
        tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        tmp.close()
        try:
            sftp.get(db_path, tmp.name)
        except FileNotFoundError:
            # БД ещё нет — создаём новую
            pass
        except Exception:
            pass

        return sftp, tmp.name, db_path
    except Exception:
        return None, None, None


def init_db_on_server(sftp, local_path: str, remote_path: str):
    """Создаёт таблицу если её нет и заливает на сервер."""
    conn = sqlite3.connect(local_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS receipts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            total_amount REAL NOT NULL,
            category TEXT NOT NULL,
            items TEXT NOT NULL,
            image_url TEXT
        )
    """)
    conn.commit()
    conn.close()
    try:
        sftp.put(local_path, remote_path)
    except Exception:
        pass


def save_receipt_to_sftp(sftp, local_path: str, remote_path: str, user_id: str, receipt: dict):
    """Сохраняет чек в БД на сервере."""
    conn = sqlite3.connect(local_path)
    conn.execute(
        "INSERT INTO receipts (user_id, date, total_amount, category, items, image_url) VALUES (?,?,?,?,?,?)",
        (
            user_id,
            receipt.get("date", datetime.now().isoformat()),
            receipt.get("total", 0),
            receipt.get("category", "Прочее"),
            json.dumps(receipt.get("items", []), ensure_ascii=False),
            receipt.get("image_url", ""),
        ),
    )
    conn.commit()
    conn.close()
    try:
        sftp.put(local_path, remote_path)
    except Exception:
        pass


def get_receipts_from_sftp(local_path: str, user_id: str) -> list[dict]:
    """Возвращает чеки пользователя."""
    try:
        conn = sqlite3.connect(local_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC", (user_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []


def upload_to_s3(endpoint: str, access_key: str, secret_key: str, bucket: str, image_bytes: bytes) -> str | None:
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


# --- Routes ---

@app.post("/api/scan")
async def scan_receipt(req: ScanRequest, request: Request):
    """Сканирует чек, сохраняет в БД на VPS."""
    proxyapi_key = get_header(request, "X-ProxyAPI-Key")
    if not proxyapi_key:
        return {"error": "X-ProxyAPI-Key header is missing or empty"}

    selected_model = get_header(request, "X-Selected-Model", "openai/gpt-4o-mini")
    user_id = get_header(request, "X-User-ID", "default")
    image_data = req.image

    if not image_data:
        return {"error": "No image data provided"}

    try:
        import base64
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return {"error": "Invalid base64 image"}

    # S3
    s3_cfg = {}
    try:
        s3_endpoint = get_header(request, "X-S3-Endpoint")
        s3_access = get_header(request, "X-S3-Access-Key")
        s3_secret = get_header(request, "X-S3-Secret-Key")
        s3_bucket = get_header(request, "X-S3-Bucket")
        if s3_endpoint and s3_access:
            s3_cfg = {"endpoint": s3_endpoint, "access_key": s3_access, "secret_key": s3_secret, "bucket": s3_bucket}
    except Exception:
        pass

    image_url: str | None = None
    if s3_cfg:
        image_url = upload_to_s3(s3_cfg["endpoint"], s3_cfg["access_key"], s3_cfg["secret_key"], s3_cfg["bucket"], image_bytes)
    if image_url is None:
        image_url = f"data:image/jpeg;base64,{image_data}"

    # Распознавание
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://proxyapi.ru/chat/completions",
                headers={"Authorization": f"Bearer {proxyapi_key}", "Content-Type": "application/json"},
                json={
                    "model": selected_model,
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
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1].removesuffix("```")
                result = json.loads(content)

                # Сохраняем в БД на VPS
                sftp, local_path, remote_path = get_sftp_connection(request)
                if sftp and local_path:
                    init_db_on_server(sftp, local_path, remote_path)
                    save_receipt_to_sftp(sftp, local_path, remote_path, user_id, {
                        "date": result.get("date", datetime.now().strftime("%d.%m.%Y")),
                        "total": result.get("total", 0),
                        "category": (result.get("items", [{}])[0].get("category", "Прочее") if result.get("items") else "Прочее"),
                        "items": result.get("items", []),
                        "image_url": image_url,
                    })
                    sftp.sftp.close() if hasattr(sftp, 'sftp') else None
                    try:
                        os.unlink(local_path)
                    except Exception:
                        pass

                return result
            else:
                return {"error": f"ProxyAPI {resp.status_code}", "raw_text": ""}
    except httpx.TimeoutException:
        return {"error": "ProxyAPI timeout", "raw_text": ""}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}", "raw_text": ""}
    except Exception as e:
        return {"error": f"Scan error: {str(e)[:200]}", "raw_text": ""}


@app.get("/api/analytics")
async def get_analytics(request: Request):
    """Возвращает чеки пользователя для графиков."""
    user_id = get_header(request, "X-User-ID", "default")
    sftp, local_path, remote_path = get_sftp_connection(request)

    if not sftp or not local_path:
        return []

    # Синхронизируем сначала
    try:
        sftp.get(remote_path, local_path)
    except Exception:
        pass

    receipts = get_receipts_from_sftp(local_path, user_id)

    try:
        sftp.sftp.close() if hasattr(sftp, 'sftp') else None
        os.unlink(local_path)
    except Exception:
        pass

    return receipts


@app.post("/api/reports/pdf")
async def generate_pdf(request: Request):
    """Генерирует PDF-отчёт через fpdf2."""
    user_id = get_header(request, "X-User-ID", "default")
    sftp, local_path, remote_path = get_sftp_connection(request)

    receipts = []
    if sftp and local_path:
        try:
            sftp.get(remote_path, local_path)
        except Exception:
            pass
        receipts = get_receipts_from_sftp(local_path, user_id)
        try:
            sftp.sftp.close() if hasattr(sftp, 'sftp') else None
            os.unlink(local_path)
        except Exception:
            pass

    try:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        # Поддержка кириллицы
        pdf.add_font("DejaVu", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", uni=True)
        pdf.set_font("DejaVu", "", 16)
        pdf.cell(0, 10, "НАЛОГОВЫЙ ОТЧЁТ — Бабки Скан", ln=True, align="C")
        pdf.ln(5)
        pdf.set_font("DejaVu", "", 10)
        pdf.cell(0, 8, f"Пользователь: {user_id}", ln=True)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", ln=True)
        pdf.cell(0, 8, f"Операций: {len(receipts)}", ln=True)
        total = sum(r.get("total_amount", 0) for r in receipts)
        pdf.cell(0, 8, f"Итого расходов: {total:,.2f} ₽", ln=True)
        pdf.ln(5)

        # Таблица
        pdf.set_font("DejaVu", "", 8)
        pdf.cell(30, 6, "Дата", border=1)
        pdf.cell(25, 6, "Категория", border=1)
        pdf.cell(30, 6, "Сумма", border=1, align="R")
        pdf.cell(100, 6, "Товары", border=1)
        pdf.ln()
        for r in receipts:
            items = json.loads(r.get("items", "[]"))
            names = ", ".join(i.get("name", "")[:20] for i in items[:3])
            pdf.cell(30, 6, r.get("date", "")[:10], border=1)
            pdf.cell(25, 6, r.get("category", "")[:14], border=1)
            pdf.cell(30, 6, f"{r.get('total_amount', 0):,.2f}", border=1, align="R")
            pdf.cell(100, 6, names[:45], border=1)
            pdf.ln()

        buf = pdf.output()
        return Response(content=buf, media_type="application/pdf",
                        headers={"Content-Disposition": f"attachment; filename=otchet_{user_id}.pdf"})
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)[:200]}"}


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