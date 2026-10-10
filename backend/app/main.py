from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import User  # Ensure models are loaded
from app.api.api import api_router
from app.api.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("securetwingrid")


def _migrate_and_seed_db():
    """Ensure table columns are up to date and seed default admin/prosumer if empty."""
    from sqlalchemy import inspect, text
    from app.core.database import SessionLocal
    from app.core.security import get_password_hash, generate_ecc_keypair
    from app.models.user import User, UserRole, UserStatus, ApprovalStatus
    from datetime import datetime, timezone

    # 1. Check and add missing columns to SQLite / PostgreSQL
    try:
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = {c["name"] for c in inspector.get_columns("users")}
            with engine.begin() as conn:
                if "full_name" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(128)"))
                if "approval_status" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approval_status VARCHAR(32) DEFAULT 'APPROVED'"))
                if "unit" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN unit VARCHAR(64) DEFAULT 'A-204'"))
                if "household_id" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN household_id VARCHAR(64) DEFAULT 'HH-001'"))
                if "phone" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(32)"))
                if "approved_at" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_at TIMESTAMP"))
                if "approved_by" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN approved_by VARCHAR(64)"))
    except Exception as exc:
        logger.warning(f"Schema migration notice: {exc}")

    # 2. Seed default admin if none exists
    try:
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.username == "sys_admin").first()
            if not admin_user:
                pub, _ = generate_ecc_keypair()
                admin_user = User(
                    full_name="System Administrator",
                    username="sys_admin",
                    email="admin@energy.org",
                    password_hash=get_password_hash("AdminStrongPassword999!"),
                    role=UserRole.ADMIN.value,
                    status=UserStatus.ACTIVE.value,
                    approval_status=ApprovalStatus.APPROVED.value,
                    community="Green Valley Community",
                    unit="Admin Office",
                    household_id="ADMIN-CTRL",
                    public_key=pub,
                    created_at=datetime.now(timezone.utc),
                    approved_at=datetime.now(timezone.utc),
                    approved_by="SYSTEM_BOOTSTRAP",
                )
                db.add(admin_user)
                db.commit()
                logger.info("Default administrator 'sys_admin' seeded successfully.")
            elif admin_user.household_id in (None, "HH-001"):
                admin_user.household_id = "ADMIN-CTRL"
                db.commit()

            # Seed default approved prosumer (bob_prosumer) if none exists
            prosumer_user = db.query(User).filter(User.username == "bob_prosumer").first()
            if not prosumer_user:
                pub, _ = generate_ecc_keypair()
                prosumer_user = User(
                    full_name="Bob Martinez",
                    username="bob_prosumer",
                    email="bob@microgrid.edu",
                    password_hash=get_password_hash("UserStrongPassword123!"),
                    role=UserRole.USER.value,
                    status=UserStatus.ACTIVE.value,
                    approval_status=ApprovalStatus.APPROVED.value,
                    community="Green Valley Community",
                    unit="Building A / A-204",
                    household_id="HH-014",
                    phone="+1 (555) 234-5678",
                    public_key=pub,
                    created_at=datetime.now(timezone.utc),
                    approved_at=datetime.now(timezone.utc),
                    approved_by="sys_admin",
                )
                db.add(prosumer_user)
                db.commit()
                logger.info("Default approved prosumer 'bob_prosumer' seeded successfully.")
            elif prosumer_user.household_id in (None, "HH-001", "HH-014-PROSUMER"):
                prosumer_user.household_id = "HH-014"
                db.commit()

            # Normalize legacy household IDs for existing registered users to valid simulation fleet IDs
            import re
            all_users = db.query(User).all()
            for u in all_users:
                if u.household_id and (u.household_id.startswith("HH-BUILDING-") or not re.match(r"^HH-\d{3}$", u.household_id)):
                    if u.role == UserRole.ADMIN.value:
                        continue
                    digits = re.findall(r"\d+", u.household_id or u.unit or "")
                    if digits:
                        num = int(digits[0])
                        mapped_num = ((num - 1) % 100) + 1
                        u.household_id = f"HH-{mapped_num:03d}"
                    else:
                        h_val = sum(ord(c) for c in (u.username or "user"))
                        u.household_id = f"HH-{(h_val % 100) + 1:03d}"
            db.commit()
        finally:
            db.close()
    except Exception as exc:
        logger.warning(f"Default user seeding notice: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] environment")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
        _migrate_and_seed_db()
    except Exception as e:
        logger.warning(f"Database table initialization notice: {e}")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")



app = FastAPI(
    title="SecureTwinGrid Digital Twin & P2P Trading API",
    description="REST API interface for the SecureTwinGrid digital twin simulation engine and peer-to-peer electricity trading system.",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, list):
    allowed_origins = origins
else:
    allowed_origins = [str(origins)]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Direct root-level /health endpoint
app.include_router(health_router, prefix="", tags=["Root Health"])

# API router mounted on /api and /api/v1
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix=settings.API_V1_STR)



@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": "/health",
        "status": "operational",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )
