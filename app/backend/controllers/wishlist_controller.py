# app/backend/controllers/wishlist_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List

from ..models.wishlist import WishlistItem, WishlistItemResponse
from ..controllers import product_controller
from ..utils.database import get_db


async def add_to_wishlist(user_id: str, product_id: str) -> WishlistItemResponse:
    db = get_db()

    # Check if product exists
    product = await product_controller.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if item is already in wishlist
    existing_item = await db.wishlist.find_one({
        "user_id": user_id,
        "product_id": product_id
    })

    if existing_item:
        return WishlistItemResponse(
            id=existing_item["id"],
            user_id=existing_item["user_id"],
            product_id=existing_item["product_id"],
            created_at=existing_item["created_at"],
            product_name=product.name,
            product_price=product.price,
            product_image=product.images[0] if product.images else None
        )

    # Add to wishlist
    item_id = str(uuid.uuid4())
    wishlist_item = WishlistItem(
        id=item_id,
        user_id=user_id,
        product_id=product_id,
        created_at=datetime.now(UTC)
    )

    await db.wishlist.insert_one(wishlist_item.model_dump())

    # Return response with product details
    return WishlistItemResponse(
        **wishlist_item.model_dump(),
        product_name=product.name,
        product_price=product.price,
        product_image=product.images[0] if product.images else None
    )


async def get_wishlist(user_id: str) -> List[WishlistItemResponse]:
    db = get_db()

    # Get all wishlist items for the user
    cursor = db.wishlist.find({"user_id": user_id})
    wishlist_items = await cursor.to_list(length=100)

    result = []

    for item in wishlist_items:
        # Get product details for each wishlist item
        product = await product_controller.get_product(item["product_id"])

        if product:
            result.append(WishlistItemResponse(
                id=item["id"],
                user_id=item["user_id"],
                product_id=item["product_id"],
                created_at=item["created_at"],
                product_name=product.name,
                product_price=product.price,
                product_image=product.images[0] if product.images else None
            ))

    return result


async def remove_from_wishlist(user_id: str, product_id: str) -> bool:
    db = get_db()

    result = await db.wishlist.delete_one({
        "user_id": user_id,
        "product_id": product_id
    })

    return result.deleted_count > 0


async def is_in_wishlist(user_id: str, product_id: str) -> bool:
    db = get_db()

    item = await db.wishlist.find_one({
        "user_id": user_id,
        "product_id": product_id
    })

    return item is not None


async def clear_wishlist(user_id: str) -> int:
    db = get_db()

    result = await db.wishlist.delete_many({"user_id": user_id})

    return result.deleted_count