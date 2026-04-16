from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sistema de Recursos Humanos API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = True
    database_url: str = "sqlite:///./rh_surveys.db"
    database_echo: bool = False
    jwt_secret_key: str = "change-this-secret-for-development"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    ldap_enabled: bool = False
    ldap_server_uri: str | None = None
    ldap_use_ssl: bool = False
    ldap_start_tls: bool = False
    ldap_validate_certificates: bool = True
    ldap_bind_dn: str | None = None
    ldap_bind_password: str | None = None
    ldap_user_base_dn: str | None = None
    ldap_user_filter: str = "(mail={username})"
    ldap_user_dn_template: str | None = None
    ldap_timeout_seconds: float = 5.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
