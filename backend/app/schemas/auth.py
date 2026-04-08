from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import RoleEnum


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
    last_login_at: datetime | None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class AdminSessionResponse(BaseModel):
    user: AuthUserResponse
