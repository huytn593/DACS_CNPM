from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: str
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_district: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_district: Optional[str] = None
    billing_postal_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(UserBase):
    password: str
    role: str = Field(default="user")

    @field_validator('role', mode='before')
    @classmethod
    def validate_role(cls, v):
        if v not in ["user", "seller", "admin"]:
            raise ValueError('Role must be one of: user, seller, admin')
        return v

    @field_validator('phone_number', mode='before')
    @classmethod
    def validate_phone(cls, v):
        if not v.startswith('0') or not v.isdigit() or len(v) != 10:
            raise ValueError('Phone number must be 10 digits and start with 0')
        return v


class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_district: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_district: Optional[str] = None
    billing_postal_code: Optional[str] = None
    password: Optional[str] = None

    @field_validator('phone_number',  mode='before')
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            if not v.startswith('0') or not v.isdigit() or len(v) != 10:
                raise ValueError('Phone number must be 10 digits and start with 0')
        return v


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    role: str
    created_at: datetime