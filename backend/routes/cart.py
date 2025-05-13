from fastapi import APIRouter, Depends, HTTPException, status
from ..models.cart import CartItemCreate, CartItemUpdate, CartResponse
from ..models.user import User
from ..controllers.cart_controller import (
    get_user_cart,
    add_to_cart,
    update_cart_item,
    remove_cart_item,
    clear_cart
)
from ..utils.auth import get_current_user

router = APIRouter(tags=["cart"])

@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: User = Depends(get_current_user)):
    """
    Lấy giỏ hàng của người dùng hiện tại
    """
    return await get_user_cart(current_user["id"])

@router.post("/cart")
async def add_item_to_cart(item: CartItemCreate, current_user: User = Depends(get_current_user)):
    """
    Thêm sản phẩm vào giỏ hàng
    """
    return await add_to_cart(current_user["id"], item)

@router.put("/cart/items/{item_id}")
async def update_item_in_cart(item_id: str, item_update: CartItemUpdate, current_user: User = Depends(get_current_user)):
    """
    Cập nhật số lượng sản phẩm trong giỏ hàng
    """
    return await update_cart_item(current_user["id"], item_id, item_update)

@router.delete("/cart/items/{item_id}")
async def delete_cart_item(item_id: str, current_user: User = Depends(get_current_user)):
    """
    Xóa một sản phẩm khỏi giỏ hàng
    """
    return await remove_cart_item(current_user["id"], item_id)

@router.delete("/cart")
async def empty_cart(current_user: User = Depends(get_current_user)):
    """
    Xóa toàn bộ giỏ hàng
    """
    return await clear_cart(current_user["id"])