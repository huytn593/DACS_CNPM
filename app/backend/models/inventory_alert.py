from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, UTC


class InventoryAlert(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: str
    seller_id: str
    threshold: int
    current_stock: int
    is_resolved: bool = False
    created_at: datetime = datetime.now(UTC)
    updated_at: Optional[datetime] = None


class InventoryAlertCreate(BaseModel):
    product_id: str
    threshold: int


class InventoryAlertResponse(InventoryAlert):
    id: str
