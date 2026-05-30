"""FastAPI backend for СканУчёт БДА Групп — PostgreSQL + JWT auth + AI receipt scanning."""
import json
import io
import uuid
import base64
import os
from datetime import datetime, timedelta

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from mangum import Mangum
import httpx
import jwt
import bcrypt

from database import (
    init_db, create_user, get_user_by_email, get_user_by_id, update_user_tariff,
    get_operations, save_operation, count_operations_this_month,
    get_settings, get_settings_raw, save_settings,
    get_reports, save_report,
    create_payment, confirm_payment,
)

app = FastAPI(title="СканУчёт БДА Групп")
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- JWT ----------
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_EXPIRY_HOURS = 720  # 30 дней

TARIFF_LIMITS = {"free": 3, "start": 50, "business": 500, "pro": 999_999}

def create_jwt(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)},
        JWT_SECRET, algorithm="HS256",
    )

def decode_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub", "")
    except Exception:
        return ""

async def get_user_id(request: Request) -> str:
    """Извлекает user_id из JWT токена."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        uid = decode_jwt(auth[7:])
        if uid:
            return uid
    # Fallback for old clients
    return request.headers.get("X-User-ID", "")


def check_tariff_limit(user_id: str) -> bool:
    """True если лимит не превышен."""
    user = get_user_by_id(user_id)
    if not user:
        return True
    tariff = user.get("tariff", "free")
    limit = TARIFF_LIMITS.get(tariff, 3)
    count = count_operations_this_month(user_id)
    return count < limit


# ---------- Models ----------

class AuthRequest(BaseModel):
    email: str
    password: str

class ScanRequest(BaseModel):
    image: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class OperationInput(BaseModel):
    id: str | None = None
    date: str
    place: str = ""
    total: float = 0
    type: str = "expense"
    items: list[dict] = []
    raw_text: str = ""
    image_url: str = ""

class SettingsInput(BaseModel):
    proxyapi_key: str = ""
    proxyapi_url: str = ""
    deepseek_key: str = ""
    selected_model: str = ""
    s3_endpoint: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = ""
    s3_region: str = ""
    db_url: str = ""
    sbp_tbank_key: str = ""
    sbp_merchant_id: str = ""

class ReportInput(BaseModel):
    id: str | None = None
    date: str
    period: str
    status: str = "Готов"


# ---------- Auth Endpoints ----------

@app.post("/api/auth/register")
async def register(req: AuthRequest):
    if not req.email or not req.password:
        return {"error": "Email и пароль обязательны"}
    if len(req.password) < 4:
        return {"error": "Пароль должен быть не менее 4 символов"}
    existing = get_user_by_email(req.email)
    if existing:
        return {"error": "Пользователь с таким email уже существует"}
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user = create_user(req.email, pw_hash)
    if not user:
        return {"error": "Ошибка создания пользователя"}
    token = create_jwt(user["id"])
    return {"token": token, "user": user}


@app.post("/api/auth/login")
async def login(req: AuthRequest):
    user = get_user_by_email(req.email)
    if not user:
        return {"error": "Неверный email или пароль"}
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        return {"error": "Неверный email или пароль"}
    token = create_jwt(user["id"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "tariff": user["tariff"]},
    }


@app.get("/api/auth/me")
async def me(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}
    user = get_user_by_id(uid)
    if not user:
        return {"error": "Пользователь не найден"}
    return {"id": user["id"], "email": user["email"], "tariff": user["tariff"]}


# ---------- Operations ----------

@app.get("/api/operations")
async def list_operations(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return []
    ops = get_operations(uid)
    for op in ops:
        try:
            op["items"] = json.loads(op.get("items", "[]")) if isinstance(op.get("items"), str) else op.get("items", [])
        except Exception:
            op["items"] = []
    return ops


@app.post("/api/operations")
async def create_operation(op: OperationInput, request: Request):
    uid = await get_user_id(request)
    if not uid:
        uid = "default"
    op_id = save_operation(op.model_dump(), uid)
    return {"id": op_id, "status": "ok"}


# ---------- Settings ----------

@app.get("/api/settings")
async def list_settings(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return {}
    return get_settings(uid)


@app.post("/api/settings")
async def update_settings(data: SettingsInput, request: Request):
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}
    clean = {k: v for k, v in data.model_dump().items() if v}
    save_settings(clean, uid)
    return {"status": "ok"}


# ---------- Reports ----------

@app.get("/api/reports")
async def list_reports(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return []
    return get_reports(uid)


@app.post("/api/reports")
async def create_report(entry: ReportInput, request: Request):
    uid = await get_user_id(request)
    if not uid:
        uid = "default"
    rid = save_report(entry.model_dump(), uid)
    return {"id": rid, "status": "ok"}


# ---------- S3 Upload ----------

def upload_to_s3(endpoint: str, access_key: str, secret_key: str, bucket: str, image_bytes: bytes, region: str = "ru-central1") -> str | None:
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
            region_name=region or "ru-central1",
        )
        key = f"receipts/{uuid.uuid4().hex}.jpg"
        s3.upload_fileobj(io.BytesIO(image_bytes), bucket, key, ExtraArgs={"ContentType": "image/jpeg"})
        return f"https://{bucket}.{host}/{key}"
    except Exception:
        return None


# ---------- Scan Receipt ----------

@app.post("/api/scan")
async def scan_receipt(req: ScanRequest, request: Request):
    """Сканирует чек через AI, сохраняет в БД."""
    uid = await get_user_id(request)
    if not uid:
        uid = "default"

    image_data = req.image
    if not image_data:
        return {"error": "No image data provided"}

    # Check tariff limit
    if not check_tariff_limit(uid):
        return {"error": "Лимит чеков исчерпан. Обновите тариф в разделе 🧠 Мозг."}

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return {"error": "Invalid base64 image"}

    # Get settings from DB (keys hidden from frontend)
    settings = get_settings_raw(uid)
    proxyapi_key = settings.get("proxyapi_key", "")
    proxyapi_url = settings.get("proxyapi_url", "https://api.proxyapi.ru/openai/v1")
    selected_model = settings.get("selected_model", "openai/gpt-4o-mini")

    if not proxyapi_key:
        # Mock-ответ если ключ не настроен — фронтенд не зависнет
        mock_result = {
            "success": True,
            "place": "Магазин (тестовый режим)",
            "date": datetime.now().strftime("%d.%m.%Y"),
            "items": [
                {"name": "Товар 1", "quantity": 1, "price": 500.00, "sum": 500.00, "category": "Продукты"},
                {"name": "Товар 2", "quantity": 2, "price": 350.00, "sum": 700.00, "category": "Рестораны"},
            ],
            "total": 1200.00,
            "raw_text": "Тестовый чек — API-ключ не настроен. Настройте ProxyAPI в разделе 🧠 Мозг.",
        }
        save_operation({
            "date": mock_result["date"],
            "place": mock_result["place"],
            "total": mock_result["total"],
            "type": "expense",
            "items": mock_result["items"],
            "raw_text": mock_result["raw_text"],
            "image_url": f"data:image/jpeg;base64,{image_data[:50]}...",
        }, uid)
        return mock_result

    # S3 upload
    s3_cfg = {}
    s3_endpoint = settings.get("s3_endpoint", "")
    s3_access = settings.get("s3_access_key", "")
    s3_secret = settings.get("s3_secret_key", "")
    s3_bucket = settings.get("s3_bucket", "")
    s3_region = settings.get("s3_region", "ru-central1")
    if s3_endpoint and s3_access:
        s3_cfg = {"endpoint": s3_endpoint, "access_key": s3_access, "secret_key": s3_secret, "bucket": s3_bucket, "region": s3_region}

    image_url: str | None = None
    if s3_cfg:
        image_url = upload_to_s3(s3_cfg["endpoint"], s3_cfg["access_key"], s3_cfg["secret_key"], s3_cfg["bucket"], image_bytes, s3_cfg.get("region", "ru-central1"))
    if image_url is None:
        image_url = f"data:image/jpeg;base64,{image_data}"

    # AI recognition via ProxyAPI
    if not proxyapi_url.endswith("/chat/completions"):
        proxy_url = f"{proxyapi_url.rstrip('/')}/chat/completions"
    else:
        proxy_url = proxyapi_url

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                proxy_url,
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

                # Save to DB
                save_operation({
                    "date": result.get("date", datetime.now().strftime("%d.%m.%Y")),
                    "place": result.get("place", ""),
                    "total": result.get("total", 0),
                    "type": "expense",
                    "items": result.get("items", []),
                    "raw_text": result.get("raw_text", ""),
                    "image_url": image_url,
                }, uid)

                return result
            else:
                return {"error": f"ProxyAPI {resp.status_code}", "raw_text": ""}
    except httpx.TimeoutException:
        return {"error": "ProxyAPI timeout", "raw_text": ""}
    except httpx.RequestError as e:
        return {"error": f"Request error: {str(e)[:200]}", "raw_text": ""}
    except Exception as e:
        return {"error": f"Scan error: {str(e)[:200]}", "raw_text": ""}


# ---------- PDF Report ----------

@app.post("/api/reports/pdf")
async def generate_pdf(request: Request):
    """Генерирует PDF-отчёт."""
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}

    receipts = get_operations(uid, limit=1000)
    for r in receipts:
        try:
            r["items"] = json.loads(r.get("items", "[]")) if isinstance(r.get("items"), str) else r.get("items", [])
        except Exception:
            r["items"] = []

    try:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        # Unicode font — try common paths
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "DejaVuSans.ttf",
        ]
        font_loaded = False
        for fp in font_paths:
            try:
                pdf.add_font("DejaVu", "", fp, uni=True)
                font_loaded = True
                break
            except Exception:
                continue

        if font_loaded:
            pdf.set_font("DejaVu", "", 16)
        else:
            pdf.set_font("Helvetica", size=16)

        pdf.cell(0, 10, "НАЛОГОВЫЙ ОТЧЁТ — СканУчёт БДА Групп", ln=True, align="C")
        pdf.ln(5)
        if font_loaded:
            pdf.set_font("DejaVu", "", 10)
        else:
            pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 8, f"Пользователь: {uid}", ln=True)
        pdf.cell(0, 8, f"Дата: {datetime.now().strftime('%d.%m.%Y')}", ln=True)
        pdf.cell(0, 8, f"Операций: {len(receipts)}", ln=True)
        total = sum(r.get("total", 0) for r in receipts)
        pdf.cell(0, 8, f"Итого расходов: {total:,.2f} Р", ln=True)
        pdf.ln(5)

        pdf.set_font("DejaVu" if font_loaded else "Helvetica", "", 8)
        pdf.cell(30, 6, "Дата", border=1)
        pdf.cell(25, 6, "Категория", border=1)
        pdf.cell(30, 6, "Сумма", border=1, align="R")
        pdf.cell(100, 6, "Товары", border=1)
        pdf.ln()
        for r in receipts:
            cat = r.get("items", [{}])[0].get("category", "Прочее") if r.get("items") else "Прочее"
            names = ", ".join(
                i.get("name", "")[:20] for i in (r.get("items", []) or [])[:3]
            )
            pdf.cell(30, 6, str(r.get("date", ""))[:10], border=1)
            pdf.cell(25, 6, cat[:14], border=1)
            pdf.cell(30, 6, f"{r.get('total', 0):,.2f}", border=1, align="R")
            pdf.cell(100, 6, names[:45], border=1)
            pdf.ln()

        buf = pdf.output()
        return Response(
            content=buf, media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=otchet_{uid}.pdf"},
        )
    except Exception as e:
        return {"error": f"PDF generation failed: {str(e)[:200]}"}


# ---------- Chat ----------

@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    """Чат с DeepSeek V3."""
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}

    settings = get_settings_raw(uid)
    deepseek_key = settings.get("deepseek_key", "")
    if not deepseek_key:
        return {"error": "DeepSeek ключ не настроен. Перейдите в 🧠 Мозг."}
    if not req.messages:
        return {"error": "No messages provided"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"},
                json={
                    "model": "deepseek-chat",
                    "messages": [m.model_dump() for m in req.messages],
                    "max_tokens": 1500, "temperature": 0.7,
                },
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


# ---------- Payments ----------

@app.post("/api/payments/create")
async def create_payment_endpoint(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}
    body = await request.json()
    tariff = body.get("tariff", "start")
    prices = {"start": 490, "business": 1490, "pro": 4990}
    amount = body.get("amount", prices.get(tariff, 490))
    pay_id = create_payment(uid, amount, tariff)
    return {"payment_id": pay_id, "amount": amount, "tariff": tariff, "status": "pending"}


@app.post("/api/payments/confirm")
async def confirm_payment_endpoint(request: Request):
    uid = await get_user_id(request)
    if not uid:
        return {"error": "Не авторизован"}
    body = await request.json()
    payment_id = body.get("payment_id", "")
    tariff = body.get("tariff", "start")
    if not payment_id:
        return {"error": "payment_id required"}
    ok = confirm_payment(payment_id)
    if ok:
        update_user_tariff(uid, tariff)
        return {"status": "ok", "tariff": tariff}
    return {"error": "Payment not found"}


class CheckConnectionRequest(BaseModel):
    service: str
    key: str = ""
    url: str = ""
    secret: str = ""
    bucket: str = ""
    region: str = ""
    database_url: str = ""

@app.post("/api/check-connection")
async def check_connection(req: CheckConnectionRequest):
    """Проверка соединения с внешним API. Принимает ключ напрямую для обхода CORS."""
    try:
        print(f"[check-connection] service={req.service} url={req.url[:80] if req.url else ''} bucket={req.bucket} region={req.region} db_url={'***' if req.database_url else ''}")
        service = req.service.lower()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                if service == "deepseek":
                    resp = await client.post(
                        "https://api.deepseek.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {req.key}", "Content-Type": "application/json"},
                        json={"model": "deepseek-chat", "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5},
                    )
                elif service == "proxyapi":
                    check_url = req.url.rstrip("/") + "/chat/completions" if req.url else "https://api.proxyapi.ru/openai/v1/chat/completions"
                    resp = await client.post(
                        check_url,
                        headers={"Authorization": f"Bearer {req.key}", "Content-Type": "application/json"},
                        json={"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 5},
                    )
                elif service == "s3":
                    import boto3
                    from botocore.client import Config
                    endpoint = req.url or ""
                    if not endpoint or not req.key:
                        return {"success": False, "error": "S3 endpoint и access_key обязательны"}
                    s3 = boto3.client(
                        "s3",
                        endpoint_url=endpoint if endpoint.startswith("http") else f"https://{endpoint}",
                        aws_access_key_id=req.key,
                        aws_secret_access_key=req.secret,
                        config=Config(signature_version="s3v4", connect_timeout=5, read_timeout=5, retries={"max_attempts": 1}),
                        region_name=req.region or "ru-central1",
                    )
                    if req.bucket:
                        s3.head_bucket(Bucket=req.bucket)
                        return {"success": True, "message": f"S3 доступен, бакет «{req.bucket}» найден"}
                    return {"success": True, "message": "S3 доступен (бакет не указан)"}
                elif service == "supabase":
                    db_url = req.database_url or os.getenv("DATABASE_URL", "")
                    if not db_url:
                        return {"success": False, "error": "DATABASE_URL не задан"}
                    from sqlalchemy import create_engine as ce
                    temp_engine = ce(db_url, echo=False, connect_args={"connect_timeout": 3})
                    try:
                        with temp_engine.connect() as conn:
                            conn.execute(text("SELECT 1"))
                        init_db()
                        return {"success": True, "message": "Supabase доступен, БД инициализирована"}
                    except Exception as dbe:
                        return {"success": False, "error": f"Ошибка подключения к Supabase: {str(dbe)[:200]}"}
                    finally:
                        temp_engine.dispose()
                else:
                    return {"success": False, "error": f"Неизвестный сервис: {service}"}

                if resp.status_code in (200, 400, 429):
                    return {"success": True, "message": f"{service} отвечает (код {resp.status_code})"}
                return {"success": False, "error": f"{service} вернул {resp.status_code}: {resp.text[:200]}"}
        except httpx.TimeoutException:
            return {"success": False, "error": f"Таймаут соединения с {service}"}
        except Exception as e:
            return {"success": False, "error": f"Ошибка соединения: {str(e)[:200]}"}
    except Exception as e:
        import traceback
        return {
            "success": False,
            "message": f"Ошибка на бэкенде: {str(e)}",
            "traceback": traceback.format_exc()
        }

# ---------- Health & Connection Checks ----------

@app.get("/api/health")
async def health(request: Request):
    """Общий статус системы."""
    uid = await get_user_id(request)
    user = get_user_by_id(uid) if uid else None
    tariff = user.get("tariff", "free") if user else "free"
    ops_count = count_operations_this_month(uid) if uid else 0
    limit = TARIFF_LIMITS.get(tariff, 3)
    
    settings = get_settings_raw(uid) if uid else {}
    has_proxyapi = bool(settings.get("proxyapi_key"))
    has_deepseek = bool(settings.get("deepseek_key"))
    has_s3 = bool(settings.get("s3_access_key") and settings.get("s3_endpoint"))
    
    # Проверка БД
    db_ok = False
    try:
        from database import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass
    
    return {
        "db_ok": db_ok,
        "db_type": "postgresql" if not IS_SQLITE else "sqlite",
        "authenticated": bool(uid and user),
        "tariff": tariff,
        "scans_used": ops_count,
        "scans_limit": limit,
        "has_proxyapi": has_proxyapi,
        "has_deepseek": has_deepseek,
        "has_s3": has_s3,
        "version": "2.0.0",
    }


@app.post("/api/check/s3")
async def check_s3(request: Request):
    """Проверка соединения с S3."""
    uid = await get_user_id(request)
    if not uid:
        return {"ok": False, "error": "Не авторизован"}
    
    settings = get_settings_raw(uid)
    endpoint = settings.get("s3_endpoint", "")
    access = settings.get("s3_access_key", "")
    secret = settings.get("s3_secret_key", "")
    bucket = settings.get("s3_bucket", "")
    s3_region = settings.get("s3_region", "ru-central1")
    
    if not endpoint or not access:
        return {"ok": False, "error": "S3 настройки неполные (endpoint + access_key обязательны)"}
    
    try:
        import boto3
        from botocore.client import Config
        host = endpoint.removeprefix("https://").removeprefix("http://")
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint if endpoint.startswith("http") else f"https://{endpoint}",
            aws_access_key_id=access,
            aws_secret_access_key=secret,
            config=Config(signature_version="s3v4", connect_timeout=10, read_timeout=10),
            region_name=s3_region or "ru-central1",
        )
        if bucket:
            s3.head_bucket(Bucket=bucket)
            return {"ok": True, "message": f"S3 доступен, бакет «{bucket}» найден"}
        else:
            return {"ok": True, "message": "S3 доступен (бакет не указан)"}
    except Exception as e:
        return {"ok": False, "error": f"Ошибка S3: {str(e)[:200]}"}


# ---------- Init ----------

@app.on_event("startup")
def startup():
    init_db()
