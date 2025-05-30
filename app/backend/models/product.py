# app/backend/models/product.py
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class ProductBase(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    avg_rating: Optional[float] = 0
    review_count: Optional[int] = 0
    name: str
    description: str
    price: float = Field(gt=0)
    sale_price: Optional[float] = None
    stock: int = Field(ge=0)
    categories: List[str]
    seller_id: str
    seller_name: str
    attributes: Dict[str, List[str]] = {}
    status: str = "active"
    category_id: Optional[str] = None
    sku: Optional[str] = None
    images: Optional[List[str]] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

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
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int