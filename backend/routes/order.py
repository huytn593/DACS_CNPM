from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from ..models.order import OrderCreate, OrderUpdate, OrderResponse
from ..models.user import User
from ..controllers.order_controller import (
    create_order,
    get_user_orders,
    get_order_by_id,
    update_order_status,
    cancel_order
)
from ..utils.auth import get_current_user

router = APIRouter(tags=["orders"])

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(order: OrderCreate, current_user: User = Depends(get_current_user)):
    """
    Đặt đơn hàng mới
    """
    return await create_order(current_user["id"], order)

@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    status: Optional[str] = None, 
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách đơn hàng của người dùng hiện tại
    """
    return await get_user_orders(current_user["id"], status, from_date, to_date)

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    """
    Lấy thông tin chi tiết đơn hàng
    """
    return await get_order_by_id(order_id, current_user["id"])

@router.put("/orders/{order_id}")
async def update_order(order_id: str, order_update: OrderUpdate, current_user: User = Depends(get_current_user)):
    """
    Cập nhật trạng thái đơn hàng
    """
    return await update_order_status(order_id, order_update.status, current_user["id"])

@router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: User = Depends(get_current_user)):
    """
    Hủy đơn hàng
    """
    return await cancel_order(order_id, current_user["id"])