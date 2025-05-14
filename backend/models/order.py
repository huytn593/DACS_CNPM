from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime
from .product import ProductResponse


class ShippingInfo(BaseModel):
    full_name: str
    phone: str
    email: str
    address: str
    city: str
    district: str
    zip_code: Optional[str] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: str
    product: ProductResponse
    quantity: int
    price: float
    size: Optional[str] = None
    color: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    shipping_info: ShippingInfo
    payment_method: str = Field(..., description="'cod', 'bank', 'card', 'momo'")


class OrderUpdate(BaseModel):
    status: str = Field(..., description="'pending', 'processing', 'shipped', 'delivered', 'cancelled'")


class OrderResponse(BaseModel):
    id: str
    user_id: str
    order_number: str
    items: List[OrderItemResponse]
    shipping_info: Dict
    payment_method: str
    status: str
    total_amount: float
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)