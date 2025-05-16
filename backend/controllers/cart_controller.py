# In cart_controller.py

from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, UTC
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection

from ..utils.database import get_cart_collection, get_product_collection
from ..models.cart import CartItemCreate, CartItemUpdate, CartResponse, CartItemResponse


async def get_user_cart(user_id: str) -> CartResponse:
    """Get user's cart"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Find user's cart or create if it doesn't exist
    cart = await cart_collection.find_one({"user_id": user_id})

    if not cart:
        # Create new cart for user
        new_cart = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        result = await cart_collection.insert_one(new_cart)
        cart = await cart_collection.find_one({"_id": result.inserted_id})

    # Format cart items with product details
    items = []
    for item in cart.get("items", []):
        # Get product details
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue

        items.append(CartItemResponse(
            id=str(item.get("_id", "")),
            product_id=str(item["product_id"]),
            product_name=product.get("name", "Unknown Product"),
            price=float(product.get("price", 0)),
            quantity=int(item["quantity"]),
            size=item.get("size"),
            color=item.get("color"),
            image_url=product.get("image_url", "")
        ))

    # Create cart response
    return CartResponse(
        id=str(cart["_id"]),
        user_id=user_id,
        items=items,
        created_at=cart.get("created_at", datetime.now(UTC)),
        updated_at=cart.get("updated_at", datetime.now(UTC))
    )


async def add_to_cart(user_id: str, item_data: CartItemCreate) -> CartResponse:
    """Add item to user's cart"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Verify product exists
    product = await product_collection.find_one({"_id": ObjectId(item_data.product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if product has enough stock
    if product.get("stock", 0) < item_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough stock available"
        )

    # Get user's cart
    cart = await cart_collection.find_one({"user_id": user_id})

    if not cart:
        # Create new cart for user
        new_cart = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        result = await cart_collection.insert_one(new_cart)
        cart = await cart_collection.find_one({"_id": result.inserted_id})

    # Check if the item already exists in the cart
    existing_item_index = None
    for i, item in enumerate(cart["items"]):
        if (item["product_id"] == ObjectId(item_data.product_id) and
                item.get("size") == item_data.size and
                item.get("color") == item_data.color):
            existing_item_index = i
            break

    if existing_item_index is not None:
        # Update existing item quantity
        new_quantity = cart["items"][existing_item_index]["quantity"] + item_data.quantity

        # Check stock again with new quantity
        if product.get("stock", 0) < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough stock available"
            )

        cart["items"][existing_item_index]["quantity"] = new_quantity
    else:
        # Add new item to cart
        new_item = {
            "_id": ObjectId(),
            "product_id": ObjectId(item_data.product_id),
            "quantity": item_data.quantity,
            "size": item_data.size,
            "color": item_data.color
        }
        cart["items"].append(new_item)

    # Update cart
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {
            "$set": {
                "items": cart["items"],
                "updated_at": datetime.now(UTC)
            }
        }
    )

    # Return updated cart
    return await get_user_cart(user_id)


async def update_cart_item(user_id: str, item_update: CartItemUpdate) -> CartResponse:
    """Update cart item quantity"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Get user's cart
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )

    # Find the item to update
    for i, item in enumerate(cart["items"]):
        if str(item["_id"]) == item_update.item_id:
            # Get product to check stock
            product = await product_collection.find_one({"_id": item["product_id"]})
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Product not found"
                )

            # Check if product has enough stock
            if product.get("stock", 0) < item_update.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Not enough stock available"
                )

            # Update item quantity
            cart["items"][i]["quantity"] = item_update.quantity
            break
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )

    # Update cart
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {
            "$set": {
                "items": cart["items"],
                "updated_at": datetime.now(UTC)
            }
        }
    )

    # Return updated cart
    return await get_user_cart(user_id)


async def remove_cart_item(user_id: str, item_id: str) -> CartResponse:
    """Remove item from cart"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()

    # Get user's cart
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )

    # Filter out the item to remove
    new_items = [item for item in cart["items"] if str(item["_id"]) != item_id]

    if len(new_items) == len(cart["items"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in cart"
        )

    # Update cart
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {
            "$set": {
                "items": new_items,
                "updated_at": datetime.now(UTC)
            }
        }
    )

    # Return updated cart
    return await get_user_cart(user_id)


async def clear_cart(user_id: str) -> CartResponse:
    """Clear all items from cart"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()

    # Get user's cart
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )

    # Clear cart items
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {
            "$set": {
                "items": [],
                "updated_at": datetime.now(UTC)
            }
        }
    )

    # Return updated cart
    return await get_user_cart(user_id)


async def apply_promo_code(user_id: str, code: str) -> Dict[str, Any]:
    """Apply promo code to cart"""
    # This would connect to a promo_collection to validate codes
    # For simplicity, we'll mock some valid codes
    valid_codes = {
        "WELCOME10": {"discount_percent": 10, "min_purchase": 0},
        "SUMMER20": {"discount_percent": 20, "min_purchase": 500000},
        "FLASH30": {"discount_percent": 30, "min_purchase": 1000000}
    }

    if code not in valid_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid promo code"
        )

    # Get cart to check minimum purchase requirement
    cart_response = await get_user_cart(user_id)

    # Calculate subtotal
    subtotal = sum(item.price * item.quantity for item in cart_response.items)

    # Check minimum purchase requirement
    if subtotal < valid_codes[code]["min_purchase"]:
        min_amount = valid_codes[code]["min_purchase"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum purchase of {min_amount} required for this code"
        )

    # Apply discount
    discount_percent = valid_codes[code]["discount_percent"]

    # Store the promo code in the cart
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    await cart_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "promo_code": code,
                "discount_percent": discount_percent,
                "updated_at": datetime.now(UTC)
            }
        }
    )

    return {
        "code": code,
        "discount_percent": discount_percent,
        "message": f"Promo code applied successfully! {discount_percent}% discount"
    }