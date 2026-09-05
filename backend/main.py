"""
METRA Backend — main.py
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import dashboard, evaluations, instruments, reports, settings as lab_settings_router, team

app = FastAPI(
    title="METRA API",
    description="Metrology Evaluation & Test Report Automation — Backend API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(instruments.router, prefix="/api/instruments", tags=["instruments"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["evaluations"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(team.router, prefix="/api/team", tags=["team"])
app.include_router(lab_settings_router.router, prefix="/api/settings", tags=["settings"])



@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "metra-api"}
