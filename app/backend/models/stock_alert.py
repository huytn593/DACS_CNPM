# app/backend/models/stock_alert.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StockAlert(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_image: Optional[str] = None
    seller_id: str
    current_stock: int
    threshold: int
    created_at: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class StockAlertResponse(StockAlert):
    pass