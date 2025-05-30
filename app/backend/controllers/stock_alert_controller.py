# app/backend/controllers/stock_alert_controller.py
from datetime import datetime, UTC
import uuid
from typing import List, Optional

from ..models.stock_alert import StockAlert, StockAlertResponse
from ..utils.database import get_db


async def check_stock_level(product_id: str, stock: int, threshold: int = 5) -> bool:
    """
    Check if a product has low stock and create an alert if needed
    Returns True if an alert was created, False otherwise
    """
    db = get_db()

    # Check if stock is below threshold
    if stock <= threshold:
        # Get product details
        product = await db.products.find_one({"id": product_id})
        if not product:
            return False

        # Check if an unresolved alert already exists
        existing_alert = await db.stock_alerts.find_one({
            "product_id": product_id,
            "resolved": False
        })

        if not existing_alert:
            # Create new alert
            alert = StockAlert(
                id=str(uuid.uuid4()),
                product_id=product_id,
                product_name=product.get("name", "Unknown Product"),
                product_image=product.get("images", [""])[0] if product.get("images") else None,
                seller_id=product.get("seller_id"),
                current_stock=stock,
                threshold=threshold,
                created_at=datetime.now(UTC),
                resolved=False
            )

            await db.stock_alerts.insert_one(alert.model_dump())
            return True
    else:
        # If stock is above threshold, resolve any existing alerts
        await db.stock_alerts.update_many(
            {
                "product_id": product_id,
                "resolved": False
            },
            {
                "$set": {
                    "resolved": True,
                    "resolved_at": datetime.now(UTC)
                }
            }
        )

    return False


async def get_seller_alerts(seller_id: str) -> List[StockAlertResponse]:
    """Get all unresolved stock alerts for a seller"""
    db = get_db()

    cursor = db.stock_alerts.find({
        "seller_id": seller_id,
        "resolved": False
    }).sort("created_at", -1)

    alerts = await cursor.to_list(length=None)

    return [StockAlertResponse(**alert) for alert in alerts]


async def update_stock_alert(alert_id: str, resolved: bool = True) -> Optional[StockAlertResponse]:
    """Mark a stock alert as resolved or unresolved"""
    db = get_db()

    # Get alert
    alert = await db.stock_alerts.find_one({"id": alert_id})
    if not alert:
        return None

    # Update alert
    update_data = {
        "resolved": resolved,
        "resolved_at": datetime.now(UTC) if resolved else None
    }

    await db.stock_alerts.update_one(
        {"id": alert_id},
        {"$set": update_data}
    )

    # Get updated alert
    updated_alert = await db.stock_alerts.find_one({"id": alert_id})

    return StockAlertResponse(**updated_alert)