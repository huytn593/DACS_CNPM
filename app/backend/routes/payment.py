# app/backend/routes/payment.py
from fastapi import APIRouter, Depends, Path, Body, Query, Request, HTTPException, status
from typing import Dict, Any

from app.backend.controllers import payment_controller, order_controller
from app.backend.utils.auth import get_current_user
from app.backend.utils.database import get_db

router = APIRouter(tags=["payment"])


@router.post("/payment/create-intent/{order_id}", response_model=Dict[str, Any])
async def create_payment_intent(
        order_id: str = Path(...),
        payment_data: Dict[str, Any] = Body(...),
        current_user=Depends(get_current_user)
):
    # Get order to verify ownership and amount
    order = await order_controller.get_order(order_id, current_user["id"])
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return await payment_controller.create_payment_intent(
        order_id=order_id,
        amount=order.total_amount,
        payment_method=payment_data.get("payment_method", "card")
    )


@router.post("/payment/process", response_model=Dict[str, Any])
async def process_payment(
        payment_data: Dict[str, Any] = Body(...),
        current_user=Depends(get_current_user)
):
    # Verify that the payment is for the current user's order
    db = get_db()
    order = await db.orders.find_one({
        "id": payment_data.get("order_id"),
        "user_id": current_user["id"]
    })
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or does not belong to you"
        )

    return await payment_controller.process_payment(
        payment_intent_id=payment_data.get("payment_intent_id"),
        payment_method_id=payment_data.get("payment_method_id")
    )