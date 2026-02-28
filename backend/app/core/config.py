import json
from functools import lru_cache

from pydantic import Field
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
    # Stored as str so pydantic-settings never tries to JSON-decode it
    # internally. Reads from CORS_ORIGINS env var via validation_alias.
    cors_origins_str: str = Field(
        default='["http://localhost:5173"]',
        validation_alias="cors_origins",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        populate_by_name=True,
    )

    # ── Computed properties ───────────────────────────────────────────

    @property
    def cors_origins(self) -> list[str]:
        v = self.cors_origins_str.strip()
        if not v:
            return ["http://localhost:5173"]
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            # Also accept comma-separated: http://a.com,http://b.com
            return [o.strip() for o in v.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        base = (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )
        return f"{base}?ssl=require" if self.is_production else base

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
