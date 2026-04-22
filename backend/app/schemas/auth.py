from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import AuthenticationSourceEnum, RoleEnum
from app.schemas.admin import AccessGrantResponse


class LoginRequest(BaseModel):
    login: str | None = None
    email: str | None = None
    password: str

    @model_validator(mode="after")
    def validate_identifier(self):
        if not (self.login or self.email):
            raise ValueError("login is required")
        return self

    @property
    def identifier(self) -> str:
        return (self.login or self.email or "").strip()


class AuthUserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: RoleEnum
    auth_source: AuthenticationSourceEnum
    last_login_at: datetime | None
    access_grants: list[AccessGrantResponse] = Field(default_factory=list)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class AdminSessionResponse(BaseModel):
    user: AuthUserResponse
