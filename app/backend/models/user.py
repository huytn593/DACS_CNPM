from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    role: str = Field(default="user", pattern="^(user|seller|admin)$")
    phone: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(user|seller|admin)$")
    phone: Optional[str] = None
    address: Optional[str] = None

class User(UserBase):
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime

class UserResponse(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime