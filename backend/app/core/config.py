from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sistema de Pesquisas API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = "sqlite:///./rh_surveys.db"
    database_echo: bool = False
    jwt_secret_key: str = "change-this-secret-for-development"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
