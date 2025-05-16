from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ShippingInfo(BaseModel):
    name: str
    phone: str
    address: str
    city: str
    district: str
    zip_code: Optional[str] = None


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    price: float
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None


class OrderCreate(BaseModel):
    shipping_info: ShippingInfo
    shipping_method: str = "standard"  # standard or express
    payment_method: str = "cod"  # cod, credit_card, bank_transfer
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    reason: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: List[OrderItemResponse]
    shipping_info: Dict[str, Any]
    shipping_method: str
    shipping_fee: float
    payment_method: str
    subtotal_amount: float
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    processing_date: Optional[datetime] = None
    shipped_date: Optional[datetime] = None
    delivered_date: Optional[datetime] = None
    cancelled_date: Optional[datetime] = None
    cancellation_reason: Optional[str] = None