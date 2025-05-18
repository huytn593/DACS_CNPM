# app/backend/models/wishlist.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WishlistItem(BaseModel):
    id: str
    user_id: str
    product_id: str
    created_at: datetime

class WishlistItemResponse(WishlistItem):
    product_name: str
    product_price: float
    product_image: Optional[str] = None