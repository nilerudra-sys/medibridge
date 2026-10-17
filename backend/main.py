"""
main.py — FastAPI application entry point.
Starts the background worker as an asyncio task via lifespan.
"""
from __future__ import annotations
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import get_pool, close_pool
from worker import worker_loop
from routers import patients, fhir, sync, dashboard

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medibridge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting MediBridge backend...")
    await get_pool()  # warm up pool
    worker_task = asyncio.create_task(worker_loop())
    logger.info("Background worker started.")
    yield
    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await close_pool()
    logger.info("MediBridge backend shut down.")


app = FastAPI(
    title="MediBridge API",
    description=(
        "MediBridge — SQL to FHIR R4 interoperability system for small clinics.\n\n"
        "**Validation scope**: FHIR resources are validated using the `fhir.resources` "
        "Python library against the official FHIR R4 structural schema. "
        "This is **not** full HAPI FHIR Validator validation (which requires a Java runtime)."
    ),
    version="1.0.0-mvp",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(fhir.router)
app.include_router(sync.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "MediBridge API",
        "version": "1.0.0-mvp",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health", tags=["Health"])
async def health():
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.fetchval("SELECT 1")
    return {"status": "healthy"}
