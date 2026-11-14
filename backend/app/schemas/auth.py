import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="student", pattern="^(student|instructor|admin)$")
    # Join an existing school with its code...
    organization_code: str | None = Field(default=None, max_length=20)
    # ...or, as an instructor, start a new one.
    organization_name: str | None = Field(default=None, max_length=255)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class OrganizationInfo(BaseModel):
    id: uuid.UUID
    name: str
    # Only instructors see the school's code; they're the ones who share it.
    join_code: str | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    created_at: datetime
    organization: OrganizationInfo | None = None

    @classmethod
    def from_user(cls, user) -> "UserResponse":
        org = user.organization
        return cls(
            id=user.id,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            organization=OrganizationInfo(
                id=org.id,
                name=org.name,
                join_code=org.join_code if user.role == "instructor" else None,
            )
            if org
            else None,
        )


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)


class OrganizationJoinRequest(BaseModel):
    code: str = Field(min_length=4, max_length=20)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
