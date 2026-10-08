"""Comprehensive Unit and Integration Tests for User Registration and Authentication.

Tests cover:
1. User registration (ECC keypair generation, password hashing, public key storage).
2. Duplicate email prevention.
3. Duplicate username prevention.
4. Invalid password handling during login.
5. Successful login and JWT access token issuance.
6. Protected endpoint access (/api/auth/me) with Bearer token.
7. Invalid or missing token handling on protected endpoints.
8. Verification that private keys and plaintext passwords are NEVER exposed in responses.
9. Role assignment (USER vs ADMIN).
"""

# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker
# pyrefly: ignore [missing-import]
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, UserRole
from app.core.security import verify_password

# In-memory SQLite engine for isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create all tables in memory before each test and drop them after."""
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


class TestUserRegistration:
    """Tests for POST /api/auth/register."""

    def test_successful_registration(self, client):
        payload = {
            "username": "alice_prosumer",
            "email": "alice@microgrid.edu",
            "password": "SuperSecurePassword123!",
            "role": "USER",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()

        # Check response envelope
        assert "user" in data
        assert data["user"]["username"] == "alice_prosumer"
        assert data["user"]["email"] == "alice@microgrid.edu"
        assert data["user"]["role"] == "USER"
        assert "id" in data["user"]

        # Check public key generated & stored
        assert "public_key" in data["user"]
        assert "-----BEGIN PUBLIC KEY-----" in data["user"]["public_key"]

        # Check private key one-time returned to client for local signing
        assert "private_key_pem" in data
        assert "-----BEGIN PRIVATE KEY-----" in data["private_key_pem"]

        # Ensure password_hash is NEVER returned in response
        assert "password_hash" not in data["user"]
        assert "password" not in data["user"]

        # Verify password is encrypted in database
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.username == "alice_prosumer").first()
        assert db_user is not None
        assert db_user.password_hash != "SuperSecurePassword123!"
        assert verify_password("SuperSecurePassword123!", db_user.password_hash) is True
        db.close()

    def test_duplicate_email_rejected(self, client):
        # Register first user
        client.post(
            "/api/auth/register",
            json={
                "username": "user_one",
                "email": "duplicate@microgrid.edu",
                "password": "Password12345!",
            },
        )

        # Attempt to register second user with same email
        res_dup = client.post(
            "/api/auth/register",
            json={
                "username": "user_two",
                "email": "duplicate@microgrid.edu",
                "password": "DifferentPassword123!",
            },
        )
        assert res_dup.status_code == 400
        assert "already exists" in res_dup.json()["detail"].lower()

    def test_duplicate_username_rejected(self, client):
        client.post(
            "/api/auth/register",
            json={
                "username": "same_handle",
                "email": "first@microgrid.edu",
                "password": "Password12345!",
            },
        )

        res_dup = client.post(
            "/api/auth/register",
            json={
                "username": "same_handle",
                "email": "second@microgrid.edu",
                "password": "DifferentPassword123!",
            },
        )
        assert res_dup.status_code == 400
        assert "already taken" in res_dup.json()["detail"].lower()

    def test_admin_registration_without_key_rejected(self, client):
        """Users cannot register as ADMIN without the secret admin key."""
        res = client.post(
            "/api/auth/register",
            json={
                "username": "unauthorized_admin",
                "email": "fake_admin@microgrid.edu",
                "password": "Password12345!",
                "role": "ADMIN",
            },
        )
        assert res.status_code == 403
        assert "admin registration key" in res.json()["detail"].lower()

    def test_admin_registration_with_invalid_key_rejected(self, client):
        """Users cannot register as ADMIN with an incorrect secret admin key."""
        res = client.post(
            "/api/auth/register",
            json={
                "username": "unauthorized_admin2",
                "email": "fake_admin2@microgrid.edu",
                "password": "Password12345!",
                "role": "ADMIN",
                "admin_key": "WRONG_SECRET_KEY",
            },
        )
        assert res.status_code == 403
        assert "admin registration key" in res.json()["detail"].lower()

    def test_admin_registration_with_valid_key_succeeds(self, client):
        """Authorized registration with correct admin key succeeds and grants ADMIN role."""
        res = client.post(
            "/api/auth/register",
            json={
                "username": "valid_admin",
                "email": "valid_admin@microgrid.edu",
                "password": "Password12345!",
                "role": "ADMIN",
                "admin_key": "SECURETWINGRID_ADMIN_KEY_2026",
            },
        )
        assert res.status_code == 201
        assert res.json()["user"]["role"] == "ADMIN"


class TestUserLogin:
    """Tests for POST /api/auth/login."""

    @pytest.fixture
    def registered_user(self, client):
        res = client.post(
            "/api/auth/register",
            json={
                "username": "bob_trader",
                "email": "bob@microgrid.edu",
                "password": "StrongPassword987!",
                "role": "USER",
            },
        )
        return res.json()

    def test_successful_login_with_username(self, client, registered_user):
        res = client.post(
            "/api/auth/login",
            json={
                "username": "bob_trader",
                "password": "StrongPassword987!",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "bob_trader"
        assert data["user"]["email"] == "bob@microgrid.edu"
        # Verify private key is NEVER in login response
        assert "private_key_pem" not in data
        assert "password_hash" not in data["user"]

    def test_successful_login_with_email(self, client, registered_user):
        res = client.post(
            "/api/auth/login",
            json={
                "email": "bob@microgrid.edu",
                "password": "StrongPassword987!",
            },
        )
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_invalid_password_rejected(self, client, registered_user):
        res = client.post(
            "/api/auth/login",
            json={
                "username": "bob_trader",
                "password": "WrongPassword999!",
            },
        )
        assert res.status_code == 401
        assert "invalid credentials" in res.json()["detail"].lower()

    def test_nonexistent_user_rejected(self, client):
        res = client.post(
            "/api/auth/login",
            json={
                "username": "ghost_user",
                "password": "SomePassword123!",
            },
        )
        assert res.status_code == 401


class TestProtectedEndpointAndTokenValidation:
    """Tests for GET /api/auth/me and token security."""

    @pytest.fixture
    def auth_token(self, client):
        # Register and login with required admin_key
        client.post(
            "/api/auth/register",
            json={
                "username": "carol_admin",
                "email": "carol@microgrid.edu",
                "password": "AdminPassword123!",
                "role": "ADMIN",
                "admin_key": "SECURETWINGRID_ADMIN_KEY_2026",
            },
        )
        login_res = client.post(
            "/api/auth/login",
            json={
                "username": "carol_admin",
                "password": "AdminPassword123!",
            },
        )
        return login_res.json()["access_token"]

    def test_get_me_with_valid_token(self, client, auth_token):
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert res.status_code == 200
        user_data = res.json()
        assert user_data["username"] == "carol_admin"
        assert user_data["email"] == "carol@microgrid.edu"
        assert user_data["role"] == "ADMIN"
        assert "public_key" in user_data
        # Ensure sensitive fields are NEVER exposed
        assert "password_hash" not in user_data
        assert "private_key" not in user_data

    def test_get_me_without_token_rejected(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 401
        assert "missing authorization" in res.json()["detail"].lower()

    def test_get_me_with_invalid_token_rejected(self, client):
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.fake.token.value"},
        )
        assert res.status_code == 401
        assert "invalid or expired token" in res.json()["detail"].lower()


class TestClosedCommunityAndApprovalWorkflow:
    """Tests covering closed community registration, approval, rejection, and route protection."""

    def test_registration_creates_pending_user_with_community_and_unit(self, client):
        payload = {
            "full_name": "Meenakshi Sharma",
            "username": "meenakshi_prosumer",
            "email": "meenakshi@greenvalley.example",
            "password": "Password12345!",
            "confirm_password": "Password12345!",
            "community": "Green Valley Community",
            "unit": "Building A / A-204",
            "phone": "+1 (555) 019-2834",
            "role": "USER",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["user"]["status"] == "PENDING"
        assert data["user"]["approval_status"] == "PENDING"
        assert data["user"]["community"] == "Green Valley Community"
        assert data["user"]["unit"] == "Building A / A-204"
        assert data["user"]["full_name"] == "Meenakshi Sharma"

    def test_password_mismatch_rejected(self, client):
        payload = {
            "username": "mismatch_user",
            "email": "mismatch@greenvalley.example",
            "password": "Password12345!",
            "confirm_password": "DifferentPassword12345!",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 400
        assert "passwords do not match" in res.json()["detail"].lower()

    def test_admin_pending_and_approval_flow(self, client):
        # 1. Register admin
        client.post(
            "/api/auth/register",
            json={
                "username": "grid_admin",
                "email": "admin@grid.org",
                "password": "AdminPassword123!",
                "role": "ADMIN",
                "admin_key": "SECURETWINGRID_ADMIN_KEY_2026",
            },
        )
        admin_token = client.post(
            "/api/auth/login",
            json={"username": "grid_admin", "password": "AdminPassword123!"},
        ).json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Register new participant (Pending)
        reg_res = client.post(
            "/api/auth/register",
            json={
                "username": "applicant_dave",
                "email": "dave@greenvalley.example",
                "password": "DavePassword123!",
                "unit": "Building B / B-102",
            },
        ).json()
        dave_id = reg_res["user"]["id"]

        # 3. Admin views pending registrations
        pending_res = client.get("/api/v1/admin/pending-registrations", headers=admin_headers)
        assert pending_res.status_code == 200
        pending_list = pending_res.json()
        assert any(u["id"] == dave_id for u in pending_list)

        # 4. Admin approves applicant
        approve_res = client.post(
            f"/api/v1/admin/users/{dave_id}/approve",
            headers=admin_headers,
            json={"reason": "Verified residency"},
        )
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "ACTIVE"
        assert approve_res.json()["approval_status"] == "APPROVED"
        assert approve_res.json()["approved_by"] == "grid_admin"

        # 5. User logs in and has approved status
        dave_token = client.post(
            "/api/auth/login",
            json={"username": "applicant_dave", "password": "DavePassword123!"},
        ).json()["access_token"]
        dave_headers = {"Authorization": f"Bearer {dave_token}"}
        me_res = client.get("/api/auth/me", headers=dave_headers)
        assert me_res.json()["approval_status"] == "APPROVED"

    def test_admin_rejection_flow(self, client):
        # 1. Register admin
        client.post(
            "/api/auth/register",
            json={
                "username": "grid_admin2",
                "email": "admin2@grid.org",
                "password": "AdminPassword123!",
                "role": "ADMIN",
                "admin_key": "SECURETWINGRID_ADMIN_KEY_2026",
            },
        )
        admin_token = client.post(
            "/api/auth/login",
            json={"username": "grid_admin2", "password": "AdminPassword123!"},
        ).json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Register applicant
        reg_res = client.post(
            "/api/auth/register",
            json={
                "username": "unwanted_user",
                "email": "unwanted@outside.example",
                "password": "Password12345!",
            },
        ).json()
        u_id = reg_res["user"]["id"]

        # 3. Admin rejects applicant
        reject_res = client.post(
            f"/api/v1/admin/users/{u_id}/reject",
            headers=admin_headers,
            json={"reason": "Non-community resident"},
        )
        assert reject_res.status_code == 200
        assert reject_res.json()["status"] == "REJECTED"
        assert reject_res.json()["approval_status"] == "REJECTED"


class TestHouseholdMapping:
    """Tests for deterministic, distinct User -> Simulation Household fleet mapping."""

    def test_distinct_users_assigned_distinct_simulation_households(self, client):
        # Register User A (Unit A-204)
        res_a = client.post(
            "/api/auth/register",
            json={
                "username": "user_alpha",
                "email": "alpha@example.com",
                "password": "Password12345!",
                "unit": "Building A / A-204",
            },
        )
        assert res_a.status_code == 201
        hh_a = res_a.json()["user"]["household_id"]
        assert hh_a == "HH-004"

        # Register User B (Unit B-102)
        res_b = client.post(
            "/api/auth/register",
            json={
                "username": "user_beta",
                "email": "beta@example.com",
                "password": "Password12345!",
                "unit": "Building B / B-102",
            },
        )
        assert res_b.status_code == 201
        hh_b = res_b.json()["user"]["household_id"]
        assert hh_b == "HH-002"

        # Verify User A and User B have different households
        assert hh_a != hh_b

        # Verify explicit household_id assignment
        res_c = client.post(
            "/api/auth/register",
            json={
                "username": "user_gamma",
                "email": "gamma@example.com",
                "password": "Password12345!",
                "household_id": "HH-042",
            },
        )
        assert res_c.status_code == 201
        assert res_c.json()["user"]["household_id"] == "HH-042"

    def test_login_preserves_stable_assigned_household(self, client):
        # Register User
        client.post(
            "/api/auth/register",
            json={
                "username": "stable_user",
                "email": "stable@example.com",
                "password": "Password12345!",
                "unit": "Building C / C-308",
            },
        )

        # First Login
        login_1 = client.post(
            "/api/auth/login",
            json={"username": "stable_user", "password": "Password12345!"},
        )
        assert login_1.status_code == 200
        hh_first = login_1.json()["user"]["household_id"]
        token_1 = login_1.json()["access_token"]

        me_1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_1}"})
        assert me_1.json()["household_id"] == hh_first
        assert hh_first == "HH-008"

        # Second Login (Simulate re-login after logout)
        login_2 = client.post(
            "/api/auth/login",
            json={"username": "stable_user", "password": "Password12345!"},
        )
        assert login_2.status_code == 200
        hh_second = login_2.json()["user"]["household_id"]
        assert hh_first == hh_second

