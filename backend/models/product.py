from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    size: List[str]
    color: List[str]
    stock: int
    category: str


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    size: Optional[List[str]] = None
    color: Optional[List[str]] = None
    stock: Optional[int] = None
    category: Optional[str] = None


class ProductResponse(ProductBase):
    id: str
    seller_id: str
    created_at: datetime

    class Config:
        orm_mode = True