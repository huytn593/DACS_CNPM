# app/backend/models/order.py
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    pending = "pending"  # Initial state when order is created
    seller_confirmed = "seller_confirmed"  # Seller has confirmed the order
    shipped = "shipped"  # Order has been shipped
    delivered = "delivered"  # User has confirmed receipt and payment is released to seller
    canceled = "canceled"  # Order has been canceled

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
    id: str = Field(default_factory=lambda: str(ObjectId()))
    order_number: str
    user_id: str
    user_name: str
    total_amount: float
    items: List[OrderItem]
    shipping_address: str
    billing_address: Optional[str] = None
    status: OrderStatus = OrderStatus.pending
    payment_method: str = "COD"  # Only COD is supported
    payment_status: str = "pending"
    notes: Optional[str] = None
    phone_number: str
    shipping_fee: float = 30000  # Fixed shipping fee in VND
    admin_commission: float = 0  # 5% commission for admin
    seller_amount: float = 0  # Amount seller receives after commission
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class OrderCreate(BaseModel):
    shipping_address: str
    phone_number: str
    items: List[OrderItemBase]
    payment_method: str = "COD"  # Only COD is supported

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