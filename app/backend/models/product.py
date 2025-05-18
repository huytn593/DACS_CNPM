# app/backend/models/product.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ProductBase(BaseModel):
    avg_rating: Optional[float] = 0
    review_count: Optional[int] = 0
    name: str
    description: str
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
    category_id: Optional[str] = None
    sku: Optional[str] = None
    images: Optional[List[str]] = None
    active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    category_id: Optional[str] = None
    sku: Optional[str] = None
    images: Optional[List[str]] = None
    active: Optional[bool] = None

class ProductInDB(ProductBase):
    id: str
    seller_id: str
    created_at: datetime
    updated_at: datetime
    average_rating: Optional[float] = 0
    review_count: Optional[int] = 0

class ProductResponse(ProductInDB):
    seller_name: Optional[str] = None
    category_name: Optional[str] = None
    comparison_warning: Optional[str] = None

class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int