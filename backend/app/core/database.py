import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# Determine if using SQLite or PostgreSQL with resilient fallback
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    if "postgresql" in settings.DATABASE_URL:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
except Exception as exc:
    if "postgresql" in settings.DATABASE_URL:
        logger.warning(
            f"PostgreSQL connection failed ({exc}). Falling back to local SQLite database at sqlite:///./securetwingrid.db"
        )
        settings.DATABASE_URL = "sqlite:///./securetwingrid.db"
        engine = create_engine(
            "sqlite:///./securetwingrid.db",
            pool_pre_ping=True,
            connect_args={"check_same_thread": False},
        )
    else:
        raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    """Dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> dict:
    """Checks whether the configured database connection is currently alive."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "database_type": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            "host": settings.POSTGRES_SERVER if "postgresql" in settings.DATABASE_URL else "local",
        }
    except Exception as exc:
        logger.warning(f"Database connection check failed: {exc}")
        return {
            "status": "disconnected",
            "database_type": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            "error": str(exc),
        }
