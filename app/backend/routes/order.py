# app/backend/routes/order.py
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status
from typing import List

from app.backend.models.order import OrderCreate, OrderUpdate, OrderResponse
from app.backend.controllers import order_controller, product_controller
from app.backend.controllers import seller_controller  # Add this import
from app.backend.utils.auth import get_current_user, seller_required

router = APIRouter(tags=["orders"])


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
        order: OrderCreate = Body(...),
        current_user=Depends(get_current_user)
):
    return await order_controller.create_order(current_user["id"], order)


@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(current_user=Depends(get_current_user)):
    # Regular users can only see their own orders
    if current_user["role"] == "user":
        return await order_controller.get_orders(current_user["id"])

    # Admin can see all orders
    if current_user["role"] == "admin":
        return await order_controller.get_orders()

    # Sellers can see orders containing their products
    if current_user["role"] == "seller":
        return await order_controller.get_seller_orders(current_user["id"])

    return []


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
        order_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    # Regular users can only see their own orders
    if current_user["role"] == "user":
        order = await order_controller.get_order(order_id, current_user["id"])
    else:
        # Admin can see any order
        order = await order_controller.get_order(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order


@router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(
        order_id: str = Path(...),
        order_update: OrderUpdate = Body(...),
        current_user=Depends(get_current_user)
):
    # Regular users can only update their own orders
    if current_user["role"] == "user":
        updated_order = await order_controller.update_order(order_id, order_update, current_user["id"])
    else:
        # Admin can update any order
        updated_order = await order_controller.update_order(order_id, order_update)

    if not updated_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return updated_order


@router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
        order_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    # Regular users can only delete their own orders
    if current_user["role"] == "user":
        deleted = await order_controller.delete_order(order_id, current_user["id"])
    else:
        # Admin can delete any order
        deleted = await order_controller.delete_order(order_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )


@router.get("/seller/orders", response_model=List[OrderResponse])
async def get_seller_orders(current_user=Depends(seller_required)):
    return await order_controller.get_seller_orders(current_user["id"])


@router.put("/seller/orders/{order_id}", response_model=OrderResponse)
async def update_seller_order(
        order_id: str = Path(...),
        order_update: OrderUpdate = Body(...),
        current_user=Depends(seller_required)
):
    # Get the order first
    order = await order_controller.get_order(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check if order contains seller's products
    seller_products = await seller_controller.get_seller_products(current_user["id"])
    seller_product_ids = [p.id for p in seller_products]

    has_seller_items = any(item.product_id in seller_product_ids for item in order.items)

    if not has_seller_items:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order does not contain your products"
        )

    # Seller can only update status and notes
    restricted_update = OrderUpdate(
        status=order_update.status,
        notes=order_update.notes
    )

    updated_order = await order_controller.update_order(order_id, restricted_update)

    return updated_order