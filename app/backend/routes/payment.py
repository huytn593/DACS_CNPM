# app/backend/routes/payment.py
from fastapi import APIRouter, Depends, Path, Body, Query, Request, HTTPException, status
from typing import Dict, Any

from app.backend.controllers import payment_controller, order_controller
from app.backend.utils.auth import get_current_user

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
    return await payment_controller.process_payment(
        payment_intent_id=payment_data["payment_intent_id"],
        payment_method_id=payment_data["payment_method_id"]
    )


@router.get("/payment/vnpay/create/{order_id}", response_model=Dict[str, str])
async def create_vnpay_payment(
        order_id: str = Path(...),
        return_url: str = Query(...),
        request: Request = Request,
        current_user=Depends(get_current_user)
):
    # Get order to verify ownership and amount
    order = await order_controller.get_order(order_id, current_user["id"])
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Get client IP address
    client_ip = request.client.host

    payment_url = await payment_controller.create_vnpay_url(
        order_id=order_id,
        amount=order.total_amount,
        ip_addr=client_ip,
        return_url=return_url
    )

    return {"payment_url": payment_url}


@router.get("/payment/vnpay/return", response_model=Dict[str, Any])
async def process_vnpay_return(request: Request):
    # Get all query parameters from the request
    params = dict(request.query_params)

    return await payment_controller.process_vnpay_return(params)