# In models/cart.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


class CartItemCreate(BaseModel):
    """Cart item creation model"""
    product_id: str
    quantity: int = Field(..., gt=0)
    size: Optional[str] = None
    color: Optional[str] = None


class CartItemUpdate(BaseModel):
    """Cart item update model"""
    item_id: str
    quantity: int = Field(..., gt=0)


class CartItemResponse(BaseModel):
    """Cart item response model"""
    id: str
    product_id: str
    product_name: str
    price: float
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None


class CartResponse(BaseModel):
    """Cart response model"""
    id: str
    user_id: str
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime