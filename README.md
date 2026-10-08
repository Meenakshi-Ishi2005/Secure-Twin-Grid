# SecureTwinGrid

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A research-oriented digital twin simulation of a smart microgrid for secure and privacy-preserving peer-to-peer (P2P) electricity trading.

---

## ⚡ Important Simulation Premise
- **Pure Software Simulation**: This project is **100% software-based**.
- **No Physical Hardware**: Does **NOT** require Arduino, Raspberry Pi, ESP32, physical smart meters, real solar panels, physical batteries, or IoT hardware.
- The system models a local energy community consisting of virtual households. P2P energy trading and blockchain transactions are scoped to this simulated community.
- **The system models digital energy trading and simulated energy flows over an abstract microgrid model. It does not control or transmit physical electricity.**
- All prosumer households, generation curves (Solar PV), consumption loads, battery storage systems (BESS), electric vehicles (EV), and smart meter readings are simulated programmatically in Python.

---

## 👑 Admin / Operator Role & RBAC

**The Admin/Operator manages and monitors the software-based simulated energy community. The Admin does not control physical electricity or physical grid infrastructure.**

```
Admin
  ↓
manages software simulation
  ↓
monitors households
  ↓
monitors P2P trading
  ↓
monitors blockchain
  ↓
monitors cybersecurity
  ↓
analyzes system
```

The system implements Role-Based Access Control (RBAC):
- **ADMIN / OPERATOR**: Platform management, community parameters, user access control, energy & trading monitoring, blockchain cryptographic audits, security attack simulators, privacy compliance, and append-only audit logs.
- **PARTICIPANT**: Consumers and Prosumers executing authenticated P2P market orders on the digital twin.
- Normal participants attempting to access Admin endpoints receive `HTTP 403 Forbidden`.
- Complete documentation available in [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md).


---

## 📁 Repository Structure

```
SecureTwinGrid/
│
├── frontend/                     # React + Vite + Tailwind CSS dashboard
│   ├── src/                      # Components, charts, hooks, and views
│   ├── package.json              # Frontend dependencies (React, Chart.js, Lucide)
│   ├── vite.config.js            # Vite bundler configuration
│   └── tailwind.config.js        # Tailwind CSS theme settings
│
├── backend/                      # Python FastAPI gateway & services
│   ├── app/
│   │   ├── api/                  # REST API routes & routers (e.g. /health)
│   │   ├── models/               # SQLAlchemy ORM models (BaseModel, entities)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Core business & simulation service layer
│   │   ├── core/                 # Config (pydantic-settings), database engine
│   │   └── main.py               # FastAPI application entrypoint & CORS
│   │
│   ├── tests/                    # Backend test suite (pytest & httpx)
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Backend container definition
│   └── .env.example              # Backend environment template
│
├── simulation/                   # Microgrid digital twin simulation models
├── blockchain/                   # P2P trading ledger & auction mechanisms
├── security/                     # Differential privacy & cryptographic proofs
├── attacks/                      # Adversarial testing (FDIA, double-spending)
├── analytics/                    # Grid stability, economic & privacy metrics
├── docs/                         # Architectural diagrams and research papers
│
├── docker-compose.yml            # Multi-container orchestration (DB, API, Web)
├── README.md                     # Project documentation & runbook
└── .gitignore                    # Git ignore rules for Python/Node/Docker
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js, react-chartjs-2, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, Pydantic-Settings, Uvicorn |
| **Database** | PostgreSQL 15, SQLAlchemy 2.0 ORM, psycopg2 |
| **Development** | Docker, Docker Compose, Pytest, Git |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- Docker & Docker Compose (optional, for containerized run)

---

### Option 1: Running Locally (Independent Processes)

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd SecureTwinGrid/backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env   # Windows
# cp .env.example .env   # Linux / macOS

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/api/v1/docs`
- Health Diagnostic: `http://localhost:8000/health`

#### 2. Running Backend Tests

```bash
cd SecureTwinGrid/backend
pytest
```

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd SecureTwinGrid/frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env   # Windows
# cp .env.example .env   # Linux / macOS

# Start Vite development server
npm run dev
```

- Web UI: `http://localhost:5173`

---

### Option 2: Running with Docker Compose

To spin up PostgreSQL, the FastAPI backend, and the React frontend in isolated containers:

```bash
cd SecureTwinGrid

# Build and start all services
docker-compose up --build
```

Services will be accessible at:
- **Frontend Dashboard**: `http://localhost:5173`
- **FastAPI Backend**: `http://localhost:8000`
- **FastAPI OpenAPI Docs**: `http://localhost:8000/api/v1/docs`
- **PostgreSQL Database**: `localhost:5432`

---

## 🔍 Health Endpoint Specification

### `GET /health` or `GET /api/v1/health`
Returns the status of the API and its underlying persistence layer:

```json
{
  "status": "healthy",
  "project_name": "SecureTwinGrid Backend",
  "environment": "development",
  "version": "0.1.0",
  "timestamp": "2026-10-02T12:00:00.000000",
  "database": {
    "status": "connected",
    "database_type": "postgresql",
    "host": "localhost",
    "error": null
  }
}
```

---

## 🔬 Research Roadmap & Next Stages
1. **Simulation Layer (`simulation/`)**: Digital twin time-series generation curves (solar PV), household load datasets, battery storage state-of-charge (SoC), and EV load profiles.
2. **P2P Market Engine (`blockchain/`)**: Double-auction matching algorithms, smart contract energy tokens, and clearing prices.
3. **Security & Privacy (`security/`)**: Local differential privacy (LDP) perturbations for smart meter telemetry and Zero-Knowledge Proofs (ZKP) for energy claims.
4. **Adversarial Resilience (`attacks/`)**: False Data Injection Attack (FDIA) models, collusion scenarios, and detection benchmarks.
