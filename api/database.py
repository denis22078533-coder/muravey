"""Database layer — PostgreSQL via DATABASE_URL (or SQLite fallback)."""
import os
import json
import uuid as _uuid
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./dev.db"

# Fix for some PostgreSQL providers
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

IS_SQLITE = "sqlite" in DATABASE_URL


def init_db():
    """Создаёт все таблицы если их нет."""
    with engine.connect() as conn:
        # Пользователи
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                tariff TEXT NOT NULL DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # Операции (чеки)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                place TEXT NOT NULL DEFAULT '',
                total REAL NOT NULL DEFAULT 0,
                type TEXT NOT NULL DEFAULT 'expense',
                items TEXT NOT NULL DEFAULT '[]',
                raw_text TEXT DEFAULT '',
                image_url TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # API-ключи (хранятся только на сервере!)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_settings (
                user_id TEXT PRIMARY KEY,
                proxyapi_key TEXT DEFAULT '',
                proxyapi_url TEXT DEFAULT 'https://proxyapi.ru',
                deepseek_key TEXT DEFAULT '',
                selected_model TEXT DEFAULT 'openai/gpt-4o-mini',
                s3_endpoint TEXT DEFAULT '',
                s3_access_key TEXT DEFAULT '',
                s3_secret_key TEXT DEFAULT '',
                s3_bucket TEXT DEFAULT '',
                sbp_tbank_key TEXT DEFAULT '',
                sbp_merchant_id TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # Отчёты
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                period TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Готов',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        # Платежи / тарифы
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                amount REAL NOT NULL,
                tariff TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.commit()
        print("Database initialized successfully.")


# ==================== USERS ====================

def create_user(email: str, password_hash: str) -> dict | None:
    try:
        uid = _uuid.uuid4().hex
        with SessionLocal() as session:
            session.execute(
                text("INSERT INTO users (id, email, password_hash, tariff) VALUES (:id, :email, :hash, 'free')"),
                {"id": uid, "email": email, "hash": password_hash},
            )
            session.commit()
        return {"id": uid, "email": email, "tariff": "free"}
    except Exception:
        return None


def get_user_by_email(email: str) -> dict | None:
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": email},
            ).fetchone()
            if not row:
                return None
            return dict(row._mapping)
    except Exception:
        return None


def get_user_by_id(user_id: str) -> dict | None:
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT * FROM users WHERE id = :id"),
                {"id": user_id},
            ).fetchone()
            if not row:
                return None
            return dict(row._mapping)
    except Exception:
        return None


def update_user_tariff(user_id: str, tariff: str):
    try:
        with SessionLocal() as session:
            session.execute(
                text("UPDATE users SET tariff = :tariff WHERE id = :id"),
                {"tariff": tariff, "id": user_id},
            )
            session.commit()
    except Exception:
        pass


# ==================== OPERATIONS ====================

def get_operations(user_id: str, limit: int = 500) -> list[dict]:
    try:
        with SessionLocal() as session:
            rows = session.execute(
                text("SELECT * FROM operations WHERE user_id = :uid ORDER BY date DESC LIMIT :lim"),
                {"uid": user_id, "lim": limit},
            ).fetchall()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        return []


def save_operation(op: dict, user_id: str) -> str:
    """Сохраняет чек. Возвращает id."""
    op_id = op.get("id", _uuid.uuid4().hex)
    try:
        with SessionLocal() as session:
            session.execute(
                text("""
                    INSERT INTO operations (id, user_id, date, place, total, type, items, raw_text, image_url)
                    VALUES (:id, :uid, :date, :place, :total, :type, :items, :raw, :img)
                """),
                {
                    "id": op_id,
                    "uid": user_id,
                    "date": op.get("date", datetime.now().isoformat()),
                    "place": op.get("place", ""),
                    "total": op.get("total", 0),
                    "type": op.get("type", "expense"),
                    "items": json.dumps(op.get("items", []), ensure_ascii=False),
                    "raw": op.get("raw_text", ""),
                    "img": op.get("image_url", ""),
                },
            )
            session.commit()
        return op_id
    except Exception:
        return op_id


def count_operations_this_month(user_id: str) -> int:
    """Количество чеков пользователя за текущий месяц."""
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT COUNT(*) as cnt FROM operations WHERE user_id = :uid AND type = 'expense' AND date >= :start"),
                {"uid": user_id, "start": datetime.now().replace(day=1).isoformat()},
            ).fetchone()
            return row._mapping["cnt"] if row else 0
    except Exception:
        return 0


# ==================== AI SETTINGS ====================

ALLOWED_SETTINGS = {
    "proxyapi_key", "proxyapi_url", "deepseek_key", "selected_model",
    "s3_endpoint", "s3_access_key", "s3_secret_key", "s3_bucket",
    "sbp_tbank_key", "sbp_merchant_id",
}


def get_settings(user_id: str) -> dict:
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT * FROM ai_settings WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchone()
            if not row:
                return {}
            d = _row_to_dict(row)
            # Never expose secrets in full
            return {
                "user_id": d.get("user_id", ""),
                "proxyapi_key": "***" if d.get("proxyapi_key") else "",
                "proxyapi_url": d.get("proxyapi_url", "https://proxyapi.ru"),
                "deepseek_key": "***" if d.get("deepseek_key") else "",
                "selected_model": d.get("selected_model", "openai/gpt-4o-mini"),
                "s3_endpoint": d.get("s3_endpoint", ""),
                "s3_access_key": d.get("s3_access_key", ""),
                "s3_secret_key": "***" if d.get("s3_secret_key") else "",
                "s3_bucket": d.get("s3_bucket", ""),
                "sbp_tbank_key": "***" if d.get("sbp_tbank_key") else "",
                "sbp_merchant_id": d.get("sbp_merchant_id", ""),
            }
    except Exception:
        return {}


def get_settings_raw(user_id: str) -> dict:
    """Получить настройки без маскировки (для внутреннего использования)."""
    try:
        with SessionLocal() as session:
            row = session.execute(
                text("SELECT * FROM ai_settings WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchone()
            if not row:
                return {}
            return _row_to_dict(row)
    except Exception:
        return {}


def save_settings(data: dict, user_id: str):
    filtered = {k: v for k, v in data.items() if k in ALLOWED_SETTINGS}
    if not filtered:
        return
    try:
        with SessionLocal() as session:
            existing = session.execute(
                text("SELECT 1 FROM ai_settings WHERE user_id = :uid"),
                {"uid": user_id},
            ).fetchone()
            if existing:
                cols = ", ".join(f"{k} = :{k}" for k in filtered)
                session.execute(
                    text(f"UPDATE ai_settings SET {cols}, updated_at = CURRENT_TIMESTAMP WHERE user_id = :uid"),
                    {**filtered, "uid": user_id},
                )
            else:
                session.execute(
                    text("INSERT INTO ai_settings (user_id, " + ", ".join(filtered.keys()) + ") VALUES (:uid, " + ", ".join(f":{k}" for k in filtered) + ")"),
                    {"uid": user_id, **filtered},
                )
            session.commit()
    except Exception:
        pass


# ==================== REPORTS ====================

def get_reports(user_id: str) -> list[dict]:
    try:
        with SessionLocal() as session:
            rows = session.execute(
                text("SELECT * FROM reports WHERE user_id = :uid ORDER BY created_at DESC"),
                {"uid": user_id},
            ).fetchall()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        return []


def save_report(entry: dict, user_id: str) -> str:
    rep_id = entry.get("id", _uuid.uuid4().hex)
    try:
        with SessionLocal() as session:
            session.execute(
                text("INSERT INTO reports (id, user_id, date, period, status) VALUES (:id, :uid, :date, :period, :status)"),
                {
                    "id": rep_id,
                    "uid": user_id,
                    "date": entry["date"],
                    "period": entry["period"],
                    "status": entry.get("status", "Готов"),
                },
            )
            session.commit()
        return rep_id
    except Exception:
        return rep_id


# ==================== PAYMENTS ====================

def create_payment(user_id: str, amount: float, tariff: str) -> str:
    pay_id = _uuid.uuid4().hex
    try:
        with SessionLocal() as session:
            session.execute(
                text("INSERT INTO payments (id, user_id, amount, tariff) VALUES (:id, :uid, :amount, :tariff)"),
                {"id": pay_id, "uid": user_id, "amount": amount, "tariff": tariff},
            )
            session.commit()
        return pay_id
    except Exception:
        return pay_id


def confirm_payment(payment_id: str) -> bool:
    try:
        with SessionLocal() as session:
            session.execute(
                text("UPDATE payments SET status = 'paid' WHERE id = :id"),
                {"id": payment_id},
            )
            session.commit()
        return True
    except Exception:
        return False


def _row_to_dict(row) -> dict:
    return dict(row._mapping)