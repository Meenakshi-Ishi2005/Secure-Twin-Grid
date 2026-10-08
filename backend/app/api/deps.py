"""FastAPI Authentication and Authorization Dependencies."""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and cryptographically verify the JWT Bearer token, returning the authenticated User."""
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials
    try:
        payload = decode_access_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_approved_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user is active, community-approved, and not suspended or rejected."""
    if current_user.role.upper() == UserRole.ADMIN.value:
        return current_user

    status_val = getattr(current_user, "status", "PENDING").upper()
    approval_val = getattr(current_user, "approval_status", "PENDING").upper()

    if status_val == "SUSPENDED" or approval_val == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact the community administrator.",
        )

    if status_val == "REJECTED" or approval_val == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration was not approved for this local energy community.",
        )

    if status_val != "ACTIVE" or approval_val != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration is pending community administrator approval.",
        )

    return current_user


def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require ADMIN role for privileged endpoints."""
    if current_user.role.upper() != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource",
        )
    return current_user
