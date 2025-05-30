# app/backend/controllers/payment_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import Dict, Any

from ..models.order import OrderStatus, OrderUpdate
from ..utils.database import get_db
from ..controllers import order_controller


async def create_payment_intent(order_id: str, amount: float, payment_method: str) -> Dict[str, Any]:
    """Create a payment intent for COD orders."""
    db = get_db()

    # Get the order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Only COD is supported
    if payment_method != "COD":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only COD payment method is supported"
        )

    # Create payment intent
    payment_intent = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "amount": amount,
        "payment_method": payment_method,
        "status": "pending",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    await db.payment_intents.insert_one(payment_intent)

    return payment_intent


async def process_payment(payment_intent_id: str, payment_method_id: str) -> Dict[str, Any]:
    """Process payment for COD orders."""
    db = get_db()

    # Get the payment intent
    payment_intent = await db.payment_intents.find_one({"id": payment_intent_id})
    if not payment_intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment intent not found"
        )

    # Only COD is supported
    if payment_intent["payment_method"] != "COD":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only COD payment method is supported"
        )

    # Update payment intent
    payment_intent["status"] = "pending"  # COD payments are pending until delivery
    payment_intent["payment_method_id"] = payment_method_id
    payment_intent["updated_at"] = datetime.now(UTC)

    await db.payment_intents.update_one(
        {"id": payment_intent_id},
        {"$set": payment_intent}
    )

    # Update order status to seller_confirmed
    order_update = OrderUpdate(status=OrderStatus.seller_confirmed)
    await order_controller.update_order(payment_intent["order_id"], order_update)

    return payment_intent