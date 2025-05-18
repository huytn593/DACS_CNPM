# app/backend/routes/stock_alert.py
from fastapi import APIRouter, Depends, Path, HTTPException, status
from typing import List

from app.backend.models.stock_alert import StockAlertResponse
from app.backend.controllers import stock_alert_controller
from app.backend.utils.auth import get_current_user, seller_required
from app.backend.utils.database import get_db

router = APIRouter(tags=["stock_alerts"])


@router.get("/seller/stock-alerts", response_model=List[StockAlertResponse])
async def get_seller_alerts(current_user=Depends(seller_required)):
    return await stock_alert_controller.get_seller_alerts(current_user["id"])


@router.put("/seller/stock-alerts/{alert_id}", response_model=StockAlertResponse)
async def update_stock_alert(
        alert_id: str = Path(...),
        current_user=Depends(seller_required)
):
    # First verify the alert belongs to this seller
    db = get_db()
    alert = await db.stock_alerts.find_one({"id": alert_id})

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    if alert["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this alert"
        )

    # Mark as resolved
    updated_alert = await stock_alert_controller.update_stock_alert(alert_id, True)

    if not updated_alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )

    return updated_alert