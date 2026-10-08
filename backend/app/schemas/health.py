from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: str = Field(..., description="Database connectivity status ('connected' or 'disconnected')")
    database_type: str = Field(..., description="Configured database engine ('postgresql' or 'sqlite')")
    host: Optional[str] = Field(None, description="Host address or server name")
    error: Optional[str] = Field(None, description="Error message if disconnected")


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    project_name: str = Field(..., json_schema_extra={"example": "SecureTwinGrid"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    version: str = Field(default="0.1.0")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    database: DatabaseHealth

