"""Pydantic Schemas for User Registration, Authentication, and Cryptographic Identity."""

from datetime import datetime
from typing import Optional, Dict, Any
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, ConfigDict


class UserRegisterRequest(BaseModel):
    """User registration payload."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    full_name: Optional[str] = Field(None, max_length=128, description="Participant full name")
    email: str = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong account password")
    confirm_password: Optional[str] = Field(None, description="Password confirmation")
    role: Optional[str] = Field("USER", description="Role assignment: 'USER' or 'ADMIN'")
    community: Optional[str] = Field("Green Valley Community", description="Local energy community assignment")
    unit: Optional[str] = Field("A-204", description="Household / Unit identifier (e.g. Building A / A-204)")
    household_id: Optional[str] = Field(None, description="Simulated household ID (e.g. HH-001)")
    phone: Optional[str] = Field(None, max_length=32, description="Contact phone number")
    invitation_code: Optional[str] = Field(None, description="Optional community invitation code")
    admin_key: Optional[str] = Field(None, description="Admin registration secret key (required when role is ADMIN)")


class UserLoginRequest(BaseModel):
    """User login credential payload."""
    username: Optional[str] = Field(None, description="Username (either username or email required)")
    email: Optional[str] = Field(None, description="Email address (either username or email required)")
    password: str = Field(..., min_length=1, description="Account password")


class UserResponse(BaseModel):
    """Public user profile (Never includes password hash or private key)."""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique user ID")
    full_name: Optional[str] = Field(None, description="Participant full name")
    username: str = Field(..., description="User handle")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="User role: 'USER' or 'ADMIN'")
    status: str = Field(default="PENDING", description="Account status: 'ACTIVE', 'PENDING', 'SUSPENDED', 'REJECTED'")
    approval_status: str = Field(default="PENDING", description="Approval state: 'PENDING', 'APPROVED', 'REJECTED'")
    community: str = Field(default="Green Valley Community", description="Assigned community")
    unit: Optional[str] = Field(None, description="Assigned building/unit")
    household_id: Optional[str] = Field(None, description="Linked simulated household ID")
    phone: Optional[str] = Field(None, description="Phone number")
    public_key: str = Field(..., description="Registered ECC public identity key")
    created_at: datetime = Field(..., description="Account creation timestamp")
    approved_at: Optional[datetime] = Field(None, description="Admin approval timestamp")
    approved_by: Optional[str] = Field(None, description="Admin username who approved the user")
    last_activity: Optional[datetime] = Field(None, description="Timestamp of latest activity or login")


class TokenResponse(BaseModel):
    """JWT access token response."""
    access_token: str = Field(..., description="Signed JWT Bearer token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in_seconds: int = Field(..., description="Token validity duration in seconds")
    user: UserResponse = Field(..., description="Authenticated user profile")


class UserRegisterResponse(BaseModel):
    """One-time registration response including generated cryptographic key information."""
    message: str = Field(..., description="Registration result status")
    user: UserResponse = Field(..., description="Created user profile (with stored public key)")
    private_key_pem: Optional[str] = Field(
        None,
        description=(
            "One-time display of user's generated ECC private key for client-side storage. "
            "WARNING: The server does NOT store this private key."
        )
    )
    key_algorithm: str = Field(default="ECC SECP256R1 (NIST P-256)", description="Cryptographic key algorithm")


class UserStatusUpdateRequest(BaseModel):
    """Admin user status change payload."""
    status: str = Field(..., description="New user status: 'ACTIVE', 'SUSPENDED', 'REJECTED', or 'PENDING'")
    reason: Optional[str] = Field(None, description="Optional administrative reason for audit trail")


class UserApprovalRequest(BaseModel):
    """Admin user approval or rejection payload."""
    reason: Optional[str] = Field(None, description="Optional administrative reason or note")
