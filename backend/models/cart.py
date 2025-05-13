from pydantic import BaseModel, Field
from typing import List, Optional
from .product import ProductResponse

class CartItemBase(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    size: Optional[str] = None
    color: Optional[str] = None

class CartItemCreate(CartItemBase):
    pass

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0)

class CartItemResponse(CartItemBase):
    id: str
    product: ProductResponse
    
    class Config:
        orm_mode = True

class CartResponse(BaseModel):
    id: str
    user_id: str
    items: List[CartItemResponse] = []
    
    class Config:
        orm_mode = True