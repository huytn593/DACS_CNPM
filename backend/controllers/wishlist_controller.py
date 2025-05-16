from typing import Dict, Any, List
from bson import ObjectId
from datetime import datetime, UTC
from fastapi import HTTPException, status

from ..utils.database import get_wishlist_collection, get_product_collection


async def get_user_wishlist(user_id: str) -> Dict[str, Any]:
    """Get user's wishlist"""
    wishlist_collection = get_wishlist_collection()
    product_collection = get_product_collection()

    # Check if user has a wishlist
    wishlist = await wishlist_collection.find_one({"user_id": user_id})

    if not wishlist:
        # Create new wishlist if it doesn't exist
        new_wishlist = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.now(UTC)
        }
        result = await wishlist_collection.insert_one(new_wishlist)
        wishlist = {
            "_id": result.inserted_id,
            "user_id": user_id,
            "items": [],
            "created_at": datetime.now(UTC)
        }

    # Prepare wishlist response
    wishlist_items = []

    for item in wishlist.get("items", []):
        product_id = item.get("product_id")
        try:
            product = await product_collection.find_one({"_id": ObjectId(product_id)})
            if product:
                wishlist_items.append({
                    "id": str(item.get("_id", "")),
                    "product_id": product_id,
                    "product_name": product.get("name", ""),
                    "price": product.get("price", 0),
                    "image_url": product.get("image_url", ""),
                    "added_at": item.get("added_at", datetime.now(UTC))
                })
        except Exception:
            # Skip invalid products
            continue

    return {
        "id": str(wishlist.get("_id", "")),
        "user_id": user_id,
        "items": wishlist_items
    }


async def add_to_wishlist(user_id: str, product_id: str) -> Dict[str, Any]:
    """Add product to wishlist"""
    wishlist_collection = get_wishlist_collection()
    product_collection = get_product_collection()

    # Check if product exists
    try:
        product = await product_collection.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if user has a wishlist
    wishlist = await wishlist_collection.find_one({"user_id": user_id})

    if not wishlist:
        # Create new wishlist if it doesn't exist
        new_wishlist = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.now(UTC)
        }
        result = await wishlist_collection.insert_one(new_wishlist)
        wishlist_id = result.inserted_id
    else:
        wishlist_id = wishlist.get("_id")

        # Check if product already in wishlist
        for item in wishlist.get("items", []):
            if item.get("product_id") == product_id:
                return await get_user_wishlist(user_id)

    # Add product to wishlist
    wishlist_item = {
        "_id": ObjectId(),
        "product_id": product_id,
        "added_at": datetime.now(UTC)
    }

    await wishlist_collection.update_one(
        {"_id": wishlist_id},
        {"$push": {"items": wishlist_item}}
    )

    return await get_user_wishlist(user_id)


async def remove_from_wishlist(user_id: str, item_id: str) -> Dict[str, Any]:
    """Remove item from wishlist"""
    wishlist_collection = get_wishlist_collection()

    # Check if user has a wishlist
    wishlist = await wishlist_collection.find_one({"user_id": user_id})

    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )

    # Remove item from wishlist
    try:
        await wishlist_collection.update_one(
            {"_id": wishlist.get("_id")},
            {"$pull": {"items": {"_id": ObjectId(item_id)}}}
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID format"
        )

    return await get_user_wishlist(user_id)


async def clear_wishlist(user_id: str) -> Dict[str, Any]:
    """Clear all items from wishlist"""
    wishlist_collection = get_wishlist_collection()

    # Check if user has a wishlist
    wishlist = await wishlist_collection.find_one({"user_id": user_id})

    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist not found"
        )

    # Clear wishlist
    await wishlist_collection.update_one(
        {"_id": wishlist.get("_id")},
        {"$set": {"items": []}}
    )

    return await get_user_wishlist(user_id)