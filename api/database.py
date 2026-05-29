"""Database layer — PostgreSQL via DATABASE_URL (Vercel Postgres / reg.ru / any)."""
import os
import json

# Используем синхронный SQLAlchemy + asyncpg для FastAPI
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # Fallback для локальной разработки — SQLite в памяти
    DATABASE_URL = "sqlite:///./dev.db"

# Для asyncpg URL должен начинаться с postgresql+asyncpg://
# Приводим DATABASE_URL к нужному формату
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Создаёт таблицы если их нет."""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                created_at TIMESTAMP DEFAULT now()
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                user_id TEXT NOT NULL DEFAULT 'default',
                date TIMESTAMP DEFAULT now(),
                place TEXT NOT NULL DEFAULT '',
                total REAL NOT NULL DEFAULT 0,
                type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
                items JSONB DEFAULT '[]',
                raw_text TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT now()
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS ai_settings (
                user_id TEXT PRIMARY KEY DEFAULT 'default',
                proxyapi_key TEXT DEFAULT '',
                deepseek_key TEXT DEFAULT '',
                s3_endpoint TEXT DEFAULT '',
                s3_access_key TEXT DEFAULT '',
                s3_secret_key TEXT DEFAULT '',
                s3_bucket TEXT DEFAULT '',
                tariff TEXT DEFAULT 'free',
                sbp_tbank_key TEXT DEFAULT '',
                sbp_merchant_id TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT now()
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                user_id TEXT NOT NULL DEFAULT 'default',
                date TEXT NOT NULL,
                period TEXT NOT NULL,
                status TEXT DEFAULT 'Готов',
                created_at TIMESTAMP DEFAULT now()
            );
        """))
        conn.commit()
        print("Database initialized successfully.")
    # Для SQLite: убираем gen_random_uuid()
    _ensure_sqlite_compat()


def _ensure_sqlite_compat():
    """Для SQLite — создаём таблицы с обычными uuid."""
    if "sqlite" in DATABASE_URL:
        with engine.connect() as conn:
            # Пересоздаём таблицы без gen_random_uuid()
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS operations (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default',
                    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    place TEXT NOT NULL DEFAULT '',
                    total REAL NOT NULL DEFAULT 0,
                    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
                    items TEXT DEFAULT '[]',
                    raw_text TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ai_settings (
                    user_id TEXT PRIMARY KEY DEFAULT 'default',
                    proxyapi_key TEXT DEFAULT '',
                    deepseek_key TEXT DEFAULT '',
                    s3_endpoint TEXT DEFAULT '',
                    s3_access_key TEXT DEFAULT '',
                    s3_secret_key TEXT DEFAULT '',
                    s3_bucket TEXT DEFAULT '',
                    tariff TEXT DEFAULT 'free',
                    sbp_tbank_key TEXT DEFAULT '',
                    sbp_merchant_id TEXT DEFAULT '',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default',
                    date TEXT NOT NULL,
                    period TEXT NOT NULL,
                    status TEXT DEFAULT 'Готов',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            conn.commit()


def get_operations(user_id: str = "default") -> list[dict]:
    try:
        with SessionLocal() as session:
            rows = session.execute(
                text("SELECT * FROM operations WHERE user_id = :uid ORDER BY date DESC"),
                {"uid": user_id},
            ).fetchall()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        return []


def save_operation(op: dict, user_id: str = "default"):
    import uuid as _uuid
    try:
        with SessionLocal() as session:
            session.execute(
                text("""
                    INSERT INTO operations (id, user_id, date, place, total, type, items, raw_text)
                    VALUES (:id, :uid, :date, :place, :total, :type, :items, :raw)
                """),
                {
                    "id": op.get("id", _uuid.uuid4().hex),
                    "uid": user_id,
                    "date": op["date"],
                    "place": op.get("place", ""),
                    "total": op.get("total", 0),
                    "type": op.get("type", "expense"),
                    "items": json.dumps(op.get("items", [])),
                    "raw": op.get("raw_text", ""),
                },
            )
            session.commit()
    except Exception:
        pass


def get_settings(user_id: str = "default") -> dict:
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


def save_settings(data: dict, user_id: str = "default"):
    ALLOWED = {
        "proxyapi_key", "deepseek_key",
        "s3_endpoint", "s3_access_key", "s3_secret_key", "s3_bucket",
        "tariff", "sbp_tbank_key", "sbp_merchant_id",
    }
    filtered = {k: v for k, v in data.items() if k in ALLOWED}
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
                    text(f"UPDATE ai_settings SET {cols}, updated_at = now() WHERE user_id = :uid"),
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


def get_reports(user_id: str = "default") -> list[dict]:
    try:
        with SessionLocal() as session:
            rows = session.execute(
                text("SELECT * FROM reports WHERE user_id = :uid ORDER BY created_at DESC"),
                {"uid": user_id},
            ).fetchall()
            return [_row_to_dict(r) for r in rows]
    except Exception:
        return []


def save_report(entry: dict, user_id: str = "default"):
    import uuid as _uuid
    try:
        with SessionLocal() as session:
            session.execute(
                text("""
                    INSERT INTO reports (id, user_id, date, period, status)
                    VALUES (:id, :uid, :date, :period, :status)
                """),
                {
                    "id": entry.get("id", _uuid.uuid4().hex),
                    "uid": user_id,
                    "date": entry["date"],
                    "period": entry["period"],
                    "status": entry.get("status", "Готов"),
                },
            )
            session.commit()
    except Exception:
        pass


def _row_to_dict(row) -> dict:
    return dict(row._mapping)