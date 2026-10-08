"""FastAPI Router for User Registration, Authentication, and Session Profile."""

from datetime import timedelta
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    generate_ecc_keypair,
    create_access_token,
)
from app.models.user import User, UserRole, UserStatus, ApprovalStatus
from app.schemas.user import (
    UserRegisterRequest,
    UserRegisterResponse,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User / Community Membership Application",
    description="Registers a new user account, assigns community and unit, hashes password, generates ECC identity keypair, and sets initial status to PENDING.",
)
def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserRegisterResponse:
    # 0. Check password confirmation if provided
    if request.confirm_password and request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    # 1. Check for duplicate email
    existing_email = db.query(User).filter(User.email.ilike(request.email.strip())).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{request.email.strip()}' already exists.",
        )

    # 2. Check for duplicate username
    existing_username = db.query(User).filter(User.username.ilike(request.username.strip())).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{request.username.strip()}' is already taken.",
        )

    # 3. Validate role and handle admin secret key enforcement
    req_role = (request.role or "USER").upper().strip()
    if req_role == UserRole.ADMIN.value:
        if not request.admin_key or request.admin_key.strip() != settings.ADMIN_REGISTRATION_KEY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or missing Admin Registration Key. Admin registration requires a valid secret key.",
            )
        final_role = UserRole.ADMIN.value
        initial_status = UserStatus.ACTIVE.value
        initial_approval = ApprovalStatus.APPROVED.value
    else:
        final_role = UserRole.USER.value
        initial_status = UserStatus.PENDING.value
        initial_approval = ApprovalStatus.PENDING.value

    # 4. Generate asymmetric ECC cryptographic identity keypair (SECP256R1 / NIST P-256)
    public_pem, private_pem = generate_ecc_keypair()

    # 5. Hash password (modern bcrypt)
    hashed_pwd = get_password_hash(request.password)

    # 6. Community & Household/Unit assignment
    assigned_comm = request.community.strip() if request.community else "Green Valley Community"
    assigned_unit = request.unit.strip() if request.unit else "A-204"
    clean_unit_id = assigned_unit.replace(" ", "-").replace("/", "-").upper()
    assigned_hh_id = request.household_id.strip() if request.household_id else f"HH-{clean_unit_id}"

    # 7. Create and persist user in database
    new_user = User(
        full_name=request.full_name.strip() if request.full_name else request.username.strip(),
        username=request.username.strip(),
        email=request.email.strip().lower(),
        password_hash=hashed_pwd,
        role=final_role,
        status=initial_status,
        approval_status=initial_approval,
        community=assigned_comm,
        unit=assigned_unit,
        household_id=assigned_hh_id,
        phone=request.phone.strip() if request.phone else None,
        public_key=public_pem,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    msg = (
        "Account registered successfully. Store your private key securely for transaction signing."
        if initial_approval == ApprovalStatus.APPROVED.value
        else "Registration submitted successfully. Your account is pending community administrator approval."
    )

    return UserRegisterResponse(
        message=msg,
        user=UserResponse.model_validate(new_user),
        private_key_pem=private_pem,
        key_algorithm="ECC SECP256R1 (NIST P-256)",
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User Login & Token Generation",
    description="Authenticates credentials and issues a signed JWT Bearer access token.",
)
def login_user(
    request: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    identifier = request.username or request.email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either username or email to login.",
        )

    # Search by username or email
    user = (
        db.query(User)
        .filter(
            (User.username.ilike(identifier.strip())) | (User.email.ilike(identifier.strip()))
        )
        .first()
    )

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check for account suspension
    if getattr(user, "status", "ACTIVE") == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact the platform administrator.",
        )

    # Update last activity timestamp
    try:
        from datetime import datetime, timezone
        user.last_activity = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
    except Exception:
        pass

    # Record Admin Login in Audit Trail
    if user.role.upper() == UserRole.ADMIN.value:
        try:
            from app.services.audit_service import get_audit_service
            get_audit_service().record(
                action="ADMIN_LOGIN",
                target=f"User:{user.username}",
                admin_id=str(user.id),
                admin_username=user.username,
                result="SUCCESS",
                metadata={"ip": "127.0.0.1", "role": user.role},
                db=db,
            )
        except Exception:
            pass

    # Issue JWT access token
    access_token = create_access_token(
        subject=user.id,
        username=user.username,
        role=user.role,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Returns the authenticated user's profile and public key. Protected by JWT Bearer token.",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
