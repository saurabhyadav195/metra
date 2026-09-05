"""
METRA Backend — app/config.py
Centralised environment variable loading.
"""

import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_service_key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    allowed_origins: list[str] = [
        o.strip()
        for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]

    def __post_init__(self) -> None:
        if not self.supabase_url:
            raise RuntimeError("SUPABASE_URL is not set.")
        if not self.supabase_service_key:
            raise RuntimeError("SUPABASE_SERVICE_KEY is not set.")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
