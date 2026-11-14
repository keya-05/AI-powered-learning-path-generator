from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # extra="ignore": an older .env with settings that no longer exist (e.g. NEO4J_*) still loads.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    chroma_persist_dir: str = "./chroma_data"
    storage_root: str = "./uploaded_resources"
    max_upload_size_mb: int = 25

    # AI assistant. The key is read from backend/.env; when it's empty the SDK
    # falls back to its own credential chain (env var, `ant auth login` profile).
    anthropic_api_key: str | None = None
    assistant_model: str = "claude-opus-5-5"

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
