# In routes/cart_routes.py

from fastapi import APIRouter, Depends, Body
from typing import Dict, Any

from ..controllers import cart_controller
from ..models.cart import CartItemCreate, CartItemUpdate, CartResponse
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user = Depends(get_current_user)):
    """Get user's cart"""
    return await cart_controller.get_user_cart(user_id=current_user["id"])


@router.post("/cart/add", response_model=CartResponse)
async def add_to_cart(
    item: CartItemCreate,
    current_user = Depends(get_current_user)
):
    """Add item to cart"""
    return await cart_controller.add_to_cart(
        user_id=current_user["id"],
        item_data=item
    )


@router.put("/cart/update", response_model=CartResponse)
async def update_cart_item(
    item_update: CartItemUpdate,
    current_user = Depends(get_current_user)
):
    """Update cart item quantity"""
    return await cart_controller.update_cart_item(
        user_id=current_user["id"],
        item_update=item_update
    )


@router.delete("/cart/remove", response_model=CartResponse)
async def remove_from_cart(
    item_id: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    """Remove item from cart"""
    return await cart_controller.remove_cart_item(
        user_id=current_user["id"],
        item_id=item_id
    )


@router.delete("/cart/clear", response_model=CartResponse)
async def clear_cart(current_user = Depends(get_current_user)):
    """Clear all items from cart"""
    return await cart_controller.clear_cart(user_id=current_user["id"])


@router.post("/cart/promo", response_model=Dict[str, Any])
async def apply_promo(
    code: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    """Apply promo code to cart"""
    return await cart_controller.apply_promo_code(
        user_id=current_user["id"],
        code=code
    )