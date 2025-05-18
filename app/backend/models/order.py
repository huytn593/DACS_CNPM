# app/backend/models/order.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    pending = "pending"
    shipped = "shipped"
    delivered = "delivered"
    canceled = "canceled"

class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    attributes: Optional[dict] = None

class OrderItem(OrderItemBase):
    id: str
    product_name: Optional[str] = None
    product_image: Optional[str] = None

class OrderBase(BaseModel):
    user_id: str
    shipping_address: str
    phone_number: str
    items: List[OrderItem]
    status: OrderStatus = OrderStatus.pending
    total_amount: float
    payment_method: str = "COD"
    shipping_fee: float = 30000  # Default shipping fee in VND

class OrderCreate(BaseModel):
    shipping_address: str
    phone_number: str
    items: List[OrderItemBase]
    payment_method: Optional[str] = "COD"

class Order(OrderBase):
    id: str
    created_at: datetime
    updated_at: datetime
    notes: Optional[str] = None

class OrderResponse(Order):
    pass

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    shipping_address: Optional[str] = None
    phone_number: Optional[str] = None
    notes: Optional[str] = None