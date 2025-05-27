# app/backend/models/order.py
from bson import ObjectId
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
    id: str = Field(default_factory=lambda: str(ObjectId()))  # Changed from _id to id
    order_number: str
    user_id: str
    user_name: str
    total_amount: float
    items: List[OrderItem]
    shipping_address: str
    billing_address: Optional[str] = None  # Fixed the type to str instead of using shipping_address as a type
    status: OrderStatus = OrderStatus.pending
    payment_method: str
    payment_status: str = "pending"
    notes: Optional[str] = None
    phone_number: str
    shipping_fee: float = 30000  # Default shipping fee in VND
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

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