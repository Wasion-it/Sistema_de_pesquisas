from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sistema de Pesquisas API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = "sqlite:///./rh_surveys.db"
    database_echo: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
