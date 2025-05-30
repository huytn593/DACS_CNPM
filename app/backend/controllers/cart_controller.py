# app/backend/controllers/cart_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import Optional, Dict, List, Any

from ..models.cart import CartItemCreate, CartItemUpdate, CartItem, CartResponse
from ..controllers import product_controller
from ..utils.database import get_db


async def add_to_cart(user_id: str, item_data: CartItemCreate) -> CartResponse:
    db = get_db()

    # Check if product exists
    product = await product_controller.get_product(item_data.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {item_data.product_id} not found"
        )

    # Check if stock is available
    if product.get("stock", 0) < item_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough stock for {product.get('name')}. Only {product.get('stock')} available."
        )

    # Get user's cart or create new one
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        cart = {
            "user_id": user_id,
            "items": [],
            "updated_at": datetime.now(UTC)
        }

    # Check if item already in cart
    existing_item: Optional[Dict[str, Any]] = None
    items = cart.get("items", [])
    for item in items:
        if isinstance(item, dict) and (item.get("product_id") == item_data.product_id and
                item.get("attributes") == item_data.attributes):
            existing_item = item
            break

    if existing_item:
        # Update quantity
        current_quantity = existing_item.get("quantity", 0) if isinstance(existing_item, dict) else 0
        total_quantity = current_quantity + item_data.quantity

        # Check if total quantity exceeds stock
        if total_quantity > product.get("stock", 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total quantity exceeds available stock for {product.get('name')}"
            )

        # Update item
        for item in items:
            if isinstance(item, dict) and (item.get("product_id") == item_data.product_id and
                    item.get("attributes") == item_data.attributes):
                item["quantity"] = total_quantity
                item["updated_at"] = datetime.now(UTC).isoformat()
                break
    else:
        # Add new item
        cart_item = {
            "id": str(uuid.uuid4()),
            "product_id": product.get("id"),
            "product_name": product.get("name"),
            "product_image": product.get("images", [None])[0],
            "price": product.get("price", 0),
            "quantity": item_data.quantity,
            "attributes": item_data.attributes,
            "in_stock": True,
            "added_at": datetime.now(UTC)
        }

        cart["items"].append(cart_item)

    # Update timestamp
    cart["updated_at"] = datetime.now(UTC)

    # Save cart
    if "_id" in cart:
        await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})
    else:
        await db.carts.insert_one(cart)

    # Return formatted cart
    return await get_formatted_cart(user_id)


async def get_cart(user_id: str) -> CartResponse:
    """Get user's cart with updated product information"""
    return await get_formatted_cart(user_id)


async def get_formatted_cart(user_id: str) -> CartResponse:
    """Get user's cart with up-to-date product information"""
    db = get_db()

    # Get user's cart
    cart = await db.carts.find_one({"user_id": user_id})

    if not cart or not cart.get("items"):
        return CartResponse(items=[], total=0, items_count=0)

    # Update items with current product information
    updated_items: List[CartItem] = []
    total: float = 0
    items_count: int = 0

    items = cart.get("items", [])
    for item in items:
        if not isinstance(item, dict):
            continue

        # Get current product information
        product_id = item.get("product_id")
        if not product_id:
            continue

        product = await product_controller.get_product(product_id)
        if product:
            # Update product info
            item["product_name"] = product.get("name")
            item["product_image"] = product.get("images", [None])[0]
            item["price"] = product.get("price", 0)

            # Check stock availability
            quantity = item.get("quantity", 0)
            in_stock = product.get("stock", 0) >= quantity
            item["in_stock"] = in_stock

            # Add to totals if in stock
            if in_stock:
                price = item.get("price", 0)
                total += price * quantity
                items_count += quantity

            # Convert datetime if needed
            added_at = item.get("added_at")
            if isinstance(added_at, str):
                try:
                    item["added_at"] = datetime.fromisoformat(added_at.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    item["added_at"] = datetime.now(UTC)

            updated_items.append(CartItem(**item))

    # If any items were updated, save back to database
    if updated_items:
        await db.carts.update_one(
            {"user_id": user_id},
            {"$set": {
                "items": [item.model_dump() for item in updated_items],
                "updated_at": datetime.now(UTC)
            }}
        )

    return CartResponse(
        items=updated_items,
        total=total,
        items_count=items_count
    )


async def update_cart_item(user_id: str, item_id: str, update_data: CartItemUpdate) -> Optional[CartResponse]:
    db = get_db()

    # Get user's cart
    cart = await db.carts.find_one({"user_id": user_id})

    if not cart or not cart.get("items"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart is empty"
        )

    # Find the item
    item_found = False
    items = cart.get("items", [])
    for i, item in enumerate(items):
        if isinstance(item, dict) and item.get("id") == item_id:
            item_found = True

            # If quantity is provided, update it
            if update_data.quantity is not None:
                # Check if product exists and has enough stock
                product_id = item.get("product_id")
                if not product_id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Product ID not found in cart item"
                    )

                product = await product_controller.get_product(product_id)
                if not product:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Product no longer exists"
                    )

                if product.get("stock", 0) < update_data.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Not enough stock for {product.get('name')}. Only {product.get('stock')} available."
                    )

                cart["items"][i]["quantity"] = update_data.quantity

            # If attributes are provided, update them
            if update_data.attributes is not None:
                cart["items"][i]["attributes"] = update_data.attributes

            break

    if not item_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )

    # Update timestamp
    cart["updated_at"] = datetime.now(UTC)

    # Save cart
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})

    # Return updated cart
    return await get_formatted_cart(user_id)


async def remove_cart_item(user_id: str, item_id: str) -> Optional[CartResponse]:
    db = get_db()

    # Get user's cart
    cart = await db.carts.find_one({"user_id": user_id})

    if not cart or not cart.get("items"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart is empty"
        )

    # Find and remove the item
    item_found = False
    new_items = []
    items = cart.get("items", [])

    for item in items:
        if isinstance(item, dict) and item.get("id") == item_id:
            item_found = True
        else:
            new_items.append(item)

    if not item_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )

    # Update cart with new items
    cart["items"] = new_items
    cart["updated_at"] = datetime.now(UTC)

    # Save cart
    await db.carts.update_one({"_id": cart["_id"]}, {"$set": cart})

    # Return updated cart
    return await get_formatted_cart(user_id)


async def clear_cart(user_id: str) -> CartResponse:
    db = get_db()

    # Clear all items in cart
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {
            "items": [],
            "updated_at": datetime.now(UTC)
        }},
        upsert=True
    )

    # Return empty cart
    return CartResponse(items=[], total=0, items_count=0)


async def count_cart_items(user_id: str) -> int:
    """Get the total number of items in a user's cart"""
    cart = await get_formatted_cart(user_id)
    return cart.items_count