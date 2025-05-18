# app/backend/models/cart.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    attributes: Optional[Dict[str, str]] = None  # For size, color, etc.

class CartItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, gt=0)
    attributes: Optional[Dict[str, str]] = None

class CartItem(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_image: Optional[str] = None
    price: float
    quantity: int
    attributes: Optional[Dict[str, str]] = None
    in_stock: bool = True
    added_at: datetime

class CartResponse(BaseModel):
    items: List[CartItem] = []
    total: float = 0
    items_count: int = 0