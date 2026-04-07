from datetime import datetime

from pydantic import BaseModel

from app.models.enums import RoleEnum


class LoginRequest(BaseModel):
    email: str
    password: str


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
