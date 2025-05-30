# app/backend/routes/cart.py
from fastapi import APIRouter, Depends, Path, Body

from app.backend.models.cart import CartItemCreate, CartItemUpdate, CartResponse
from app.backend.controllers import cart_controller
from app.backend.utils.auth import get_current_user

router = APIRouter(tags=["cart"])

@router.post("/cart/items", response_model=CartResponse)
async def add_to_cart(
    item: CartItemCreate = Body(...),
    current_user = Depends(get_current_user)
):
    return await cart_controller.add_to_cart(current_user["id"], item)

@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user = Depends(get_current_user)):
    return await cart_controller.get_cart(current_user["id"])

@router.put("/cart/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: str = Path(...),
    update_data: CartItemUpdate = Body(...),
    current_user = Depends(get_current_user)
):
    return await cart_controller.update_cart_item(current_user["id"], item_id, update_data)

@router.delete("/cart/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: str = Path(...),
    current_user = Depends(get_current_user)
):
    return await cart_controller.remove_cart_item(current_user["id"], item_id)

@router.delete("/cart", response_model=CartResponse)
async def clear_cart(current_user = Depends(get_current_user)):
    return await cart_controller.clear_cart(current_user["id"])

@router.get("/cart/count", response_model=dict)
async def count_cart_items(current_user = Depends(get_current_user)):
    count = await cart_controller.count_cart_items(current_user["id"])
    return {"count": count}