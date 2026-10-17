# MediBridge MVP

A lightweight SQL-to-FHIR R4 interoperability system for small clinics.

**Demo flow:** Register patient → Store in PostgreSQL → PostgreSQL trigger → Change log → Background worker → FHIR R4 conversion → Validation → View FHIR JSON → Retrieve via API.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3.11+ + FastAPI |
| Database | PostgreSQL 15 (Docker) |
| Change Detection | PostgreSQL triggers + `change_log` table |
| FHIR Processing | Python background worker (asyncio) |
| FHIR Standard | HL7 FHIR R4 |
| Validation | `fhir.resources` Python library (R4 structural validation) |
| API Docs | FastAPI Swagger UI at `/docs` |

> **Validation note:** FHIR resources are validated using the `fhir.resources` Python package against the official FHIR R4 structural schema. This is **not** HAPI FHIR Validator validation (which requires a Java runtime).

---

## Prerequisites

- Docker Desktop (running)
- Python 3.11+
- Node.js 18+
- npm 9+

---

## Setup & Startup

### Step 1 — Start PostgreSQL

```powershell
# From project root (d:\pbl_sem_7)
docker compose up -d
```

Wait until the container is healthy:
```powershell
docker ps  # should show medibridge_postgres as healthy
```

### Step 2 — Install & start the backend

```powershell
cd d:\pbl_sem_7\backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend starts at **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

### Step 3 — Seed demo data

Open a **second terminal**:

```powershell
cd d:\pbl_sem_7\backend
python seed.py
```

This inserts two fictional demo patients (P-1001: Asha Rao, P-1002: Rohan Kumar Sharma).  
The background worker will process them within ~3 seconds.

### Step 4 — Install & start the frontend

Open a **third terminal**:

```powershell
cd d:\pbl_sem_7\frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**

---

## Demo Workflow (for faculty presentation)

See [`demo_script.md`](./demo_script.md) for the step-by-step demonstration guide.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/patients` | Register a patient |
| GET | `/patients` | List patients (supports `?search=`) |
| GET | `/patients/{id}` | Get patient by patient_id |
| PUT | `/patients/{id}` | Update patient |
| GET | `/fhir/Patient` | List FHIR Bundle |
| GET | `/fhir/Patient/{id}` | Get FHIR R4 Patient resource |
| GET | `/sync/events` | Get change_log events |
| GET | `/dashboard/stats` | Get dashboard summary counts |

---

## Project Structure

```
d:\pbl_sem_7\
├── backend\
│   ├── main.py           # FastAPI app + lifespan worker
│   ├── database.py       # asyncpg connection pool
│   ├── models.py         # Pydantic models
│   ├── fhir_mapper.py    # SQL → FHIR R4 mapper
│   ├── validator.py      # fhir.resources R4 validation
│   ├── worker.py         # Background change processor
│   ├── seed.py           # Demo data seeder
│   ├── init_db.sql       # Schema + triggers
│   └── requirements.txt
├── frontend\
│   ├── src\
│   │   ├── pages\        # Dashboard, Patients, FHIRExplorer, SyncMonitor
│   │   ├── components\   # Sidebar, StatCard, PatientForm
│   │   └── api\          # Axios client
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Stopping the Application

```powershell
# Stop Docker PostgreSQL
docker compose down

# Press Ctrl+C in the backend and frontend terminals
```

## Resetting the Database

```powershell
docker compose down -v   # removes volume — clears all data
docker compose up -d     # re-creates with fresh schema
```
