# backend/models/wishlist.py

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


class WishlistItemCreate(BaseModel):
    """Wishlist item creation model"""
    product_id: str


class WishlistItemResponse(BaseModel):
    """Wishlist item response model"""
    id: str
    product_id: str
    product_name: str
    price: float
    image_url: Optional[str] = None
    added_at: datetime


class WishlistResponse(BaseModel):
    """Wishlist response model"""
    id: str
    user_id: str
    items: List[WishlistItemResponse]