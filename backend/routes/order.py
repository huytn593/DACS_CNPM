from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from ..models.order import OrderResponse, OrderCreate, OrderUpdate, OrderStatusUpdate
from ..controllers.order_controller import (
    create_order,
    get_user_orders,
    get_order_by_id,
    update_order_status,
    cancel_order
)
from ..utils.auth import get_current_user
from ..models.user import UserResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
async def create_new_order(
        order_data: OrderCreate,
        current_user: UserResponse = Depends(get_current_user)
):
    """Create a new order from cart items"""
    order = await create_order(current_user.id, order_data)
    return order


@router.get("", response_model=dict)
async def list_user_orders(
        page: int = Query(1, ge=1),
        limit: int = Query(10, ge=1, le=100),
        order_status: Optional[str] = None,  # Renamed from 'status' to 'order_status'
        search: Optional[str] = None,
        current_user: UserResponse = Depends(get_current_user)
):
    """Get orders for the current user with pagination"""
    orders, total = await get_user_orders(
        user_id=current_user.id,
        page=page,
        limit=limit,
        status=order_status,  # Pass the renamed parameter
        search=search
    )

    return {
        "orders": orders,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit  # Ceiling division
    }


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_details(
        order_id: str,
        current_user: UserResponse = Depends(get_current_user)
):
    """Get details for a specific order"""
    order = await get_order_by_id(order_id, current_user.id, current_user.role)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
        order_id: str,
        order_update: OrderUpdate,
        current_user: UserResponse = Depends(get_current_user)
):
    """Update order (admin/seller only)"""
    if current_user.role not in ["admin", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update orders"
        )

    updated_order = await update_order_status(order_id, order_update, current_user.id)
    return updated_order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_user_order(
        order_id: str,
        cancel_data: OrderStatusUpdate,
        current_user: UserResponse = Depends(get_current_user)
):
    """Cancel an order"""
    cancelled_order = await cancel_order(order_id, current_user.id, cancel_data.reason)
    return cancelled_order