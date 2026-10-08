import json
from typing import List, Union
# pyrefly: ignore [missing-import]
from pydantic import field_validator
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SecureTwinGrid Backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # PostgreSQL configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_password"
    POSTGRES_DB: str = "securetwingrid_db"

    # Full database connection string
    # Defaults to PostgreSQL, but supports overriding via env or falling back to SQLite if needed
    DATABASE_URL: str = "postgresql://postgres:postgres_password@localhost:5432/securetwingrid_db"

    # JWT & Authentication Security
    SECRET_KEY: str = "securetwingrid_jwt_super_secret_key_research_prototype_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Admin Registration Secret Key (required to register as ADMIN)
    ADMIN_REGISTRATION_KEY: str = "SECURETWINGRID_ADMIN_KEY_2026"

    # CORS origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [

        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
