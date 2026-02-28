from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────
    app_name: str = "HRMS Lite"
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # ── Database ─────────────────────────────────────────────────────
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "hrms_lite"
    db_user: str = "hrms_user"
    db_password: str = "changeme"

    # ── Security ─────────────────────────────────────────────────────
    secret_key: str = "please_change_me_to_a_strong_key"
    access_token_expire_minutes: int = 60

    # ── CORS ─────────────────────────────────────────────────────────
    # Accepts a JSON array string from env:
    #   CORS_ORIGINS='["http://localhost:5173"]'
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Computed properties ───────────────────────────────────────────
    
    @property
    def database_url_with_ssl(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?ssl=require"
        )

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — import and call this everywhere."""
    return Settings()
