"""Comprehensive Unit and Integration Tests for Admin / Operator Role and RBAC.

Test Coverage:
1. Admin login (and issuing ADMIN JWT token)
2. Normal user cannot access Admin dashboard (receives 403)
3. Normal user receives 403 on Admin endpoints (/api/admin/*)
4. Admin can access Admin endpoints with valid bearer token
5. Admin can view users list and manage user suspension
6. Admin can view all trades
7. Admin can validate blockchain and receive VALID report
8. Admin can view security events and execute controlled attack simulations
9. Admin action creates an immutable audit log entry
10. Admin cannot modify historical blockchain data (blockchain immutability verified)
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
from app.models.user import User, UserRole, UserStatus
from app.services.simulation_service import get_simulation_service
from app.services.audit_service import get_audit_service


# Isolated in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Create fresh database tables, reset audit log and simulation state before each test."""
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Reset services
    sim = get_simulation_service()
    sim.reset(num_households=50, random_seed=42)
    audit = get_audit_service()
    audit.clear()

    yield

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    """Register and login an ADMIN user, returning the JWT token."""
    reg_res = client.post(
        "/api/auth/register",
        json={
            "username": "sys_admin",
            "email": "admin@securetwingrid.org",
            "password": "AdminStrongPassword999!",
            "role": "ADMIN",
            "admin_key": "SECURETWINGRID_ADMIN_KEY_2026",
        },
    )
    assert reg_res.status_code == 201
    res = client.post(
        "/api/auth/login",
        json={
            "username": "sys_admin",
            "password": "AdminStrongPassword999!",
        },
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def normal_user_token(client):
    """Register and login a normal participant (USER), returning the JWT token."""
    client.post(
        "/api/auth/register",
        json={
            "username": "bob_prosumer",
            "email": "bob@community.org",
            "password": "UserStrongPassword123!",
            "role": "USER",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={
            "username": "bob_prosumer",
            "password": "UserStrongPassword123!",
        },
    )
    assert res.status_code == 200
    return res.json()["access_token"]


class TestAdminAuthenticationAndRBAC:
    """Tests 1, 2, 3, 4: Authentication, Authorization, and RBAC Protections."""

    def test_1_admin_login_success(self, client, admin_token):
        """Test 1: Admin can successfully log in and access profile with ADMIN role."""
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "sys_admin"
        assert data["role"] == "ADMIN"
        assert data["status"] == "ACTIVE"

    def test_2_normal_user_cannot_access_admin_dashboard(self, client, normal_user_token):
        """Test 2 & 3: Normal user receives 403 Forbidden on Admin dashboard."""
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )
        assert res.status_code == 403
        assert "administrative privileges required" in res.json()["detail"].lower()

    def test_3_unauthenticated_request_rejected(self, client):
        """Test: Unauthenticated requests to /api/admin/* receive 401 Unauthorized."""
        res = client.get("/api/admin/dashboard")
        assert res.status_code == 401

    def test_4_admin_can_access_admin_endpoints(self, client, admin_token):
        """Test 4: Admin can access /api/admin/dashboard successfully."""
        res = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "system_overview" in data
        assert "energy_overview" in data
        assert "trading_overview" in data
        assert "blockchain" in data
        assert "security" in data
        assert "system" in data


class TestAdminOperationsAndDataViewing:
    """Tests 5, 6, 7, 8, 9, 10: Admin Management Capabilities & Constraints."""

    def test_5_admin_can_view_and_manage_users(self, client, admin_token, normal_user_token):
        """Test 5: Admin can view registered users and suspend/reactivate a simulated user."""
        # 1. Admin views all users
        res = client.get(
            "/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_users"] >= 2
        user_usernames = [u["username"] for u in data["users"]]
        assert "sys_admin" in user_usernames
        assert "bob_prosumer" in user_usernames

        # Find bob's ID
        bob = next(u for u in data["users"] if u["username"] == "bob_prosumer")

        # 2. Admin suspends Bob
        suspend_res = client.post(
            f"/api/admin/users/{bob['id']}/status",
            json={"status": "SUSPENDED", "reason": "Simulated security check"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert suspend_res.status_code == 200
        assert suspend_res.json()["status"] == "SUSPENDED"

        # 3. Suspended user login attempt is blocked (403)
        login_res = client.post(
            "/api/auth/login",
            json={"username": "bob_prosumer", "password": "UserStrongPassword123!"},
        )
        assert login_res.status_code == 403
        assert "suspended" in login_res.json()["detail"].lower()

        # 4. Admin reactivates Bob
        reactivate_res = client.post(
            f"/api/admin/users/{bob['id']}/status",
            json={"status": "ACTIVE", "reason": "Clearance granted"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert reactivate_res.status_code == 200
        assert reactivate_res.json()["status"] == "ACTIVE"

    def test_6_admin_can_view_all_trades(self, client, admin_token):
        """Test 6: Admin can view all P2P trades executed in the community."""
        # Advance simulation into solar daylight hours (09:00) to generate P2P trades
        client.post("/api/simulation/start", json={"steps": 36, "run_trading": True})

        res = client.get(
            "/api/admin/trades",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "total_count" in data
        assert "trades" in data
        assert isinstance(data["trades"], list)
        if data["total_count"] > 0:
            trade = data["trades"][0]
            assert "trade_id" in trade
            assert "seller_id" in trade
            assert "buyer_id" in trade
            assert "energy_kwh" in trade
            assert "price_per_kwh" in trade

    def test_7_admin_can_validate_blockchain(self, client, admin_token):
        """Test 7: Admin can trigger blockchain validation and receive cryptographic audit results."""
        # Advance simulation to create blocks
        client.post("/api/simulation/start", json={"steps": 4, "run_trading": True})

        res = client.post(
            "/api/admin/blockchain/validate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_valid"] is True
        assert data["details"]["total_blocks"] > 0

    def test_8_admin_can_view_security_and_run_attack_simulations(self, client, admin_token):
        """Test 8: Admin can view security events and execute Replay, FDI, and Sybil attacks."""
        # 1. View security overview
        sec_res = client.get(
            "/api/admin/security",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert sec_res.status_code == 200
        assert "stats" in sec_res.json()

        # 2. Run Replay Attack simulation
        replay_res = client.post(
            "/api/admin/security/simulate-attack",
            json={"attack_type": "REPLAY", "target_id": "HH-014-PROSUMER"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert replay_res.status_code == 200
        assert replay_res.json()["attacks_blocked"] >= 1

        # 3. Run FDI Attack simulation
        fdi_res = client.post(
            "/api/admin/security/simulate-attack",
            json={"attack_type": "FDI", "target_id": "HH-042-SOLAR-PV"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert fdi_res.status_code == 200
        assert fdi_res.json()["attacks_blocked"] >= 1

        # 4. Run Sybil Attack simulation
        sybil_res = client.post(
            "/api/admin/security/simulate-attack",
            json={"attack_type": "SYBIL", "target_id": "Green Valley Community", "parameters": {"num_fake_identities": 3}},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert sybil_res.status_code == 200
        assert sybil_res.json()["attacks_blocked"] == 3

    def test_9_admin_action_creates_audit_log(self, client, admin_token):
        """Test 9: Admin operations automatically create append-only audit trail records."""
        # Change community config
        cfg_res = client.post(
            "/api/admin/community/config",
            json={"solar_penetration": 0.85, "duration_hours": 48},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert cfg_res.status_code == 200

        # Retrieve audit logs
        logs_res = client.get(
            "/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert logs_res.status_code == 200
        logs = logs_res.json()["logs"]
        assert len(logs) >= 1

        actions = [l["action"] for l in logs]
        assert "SIMULATION_CONFIG_CHANGE" in actions

    def test_10_admin_cannot_modify_historical_blockchain_data(self, client, admin_token):
        """Test 10: Verify the blockchain ledger is strictly append-only with no modification endpoints."""
        # Advance simulation
        client.post("/api/simulation/start", json={"steps": 4, "run_trading": True})

        sim_service = get_simulation_service()
        blocks_before = len(sim_service.blockchain.chain)
        assert blocks_before >= 1

        # Ensure no DELETE or PUT endpoints exist on blockchain
        delete_res = client.delete(
            "/api/admin/blockchain/blocks/1",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert delete_res.status_code in [404, 405]

        put_res = client.put(
            "/api/admin/blockchain/blocks/1",
            json={"data": "tampered"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert put_res.status_code in [404, 405]

        # Verify chain integrity remains intact
        val_res = client.post(
            "/api/admin/blockchain/validate",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert val_res.status_code == 200
        assert val_res.json()["is_valid"] is True
