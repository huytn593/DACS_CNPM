# backend/controllers/category_controller.py

from typing import List, Dict, Any, Optional
from bson import ObjectId
from datetime import datetime, UTC
from fastapi import HTTPException, status

from ..utils.database import get_category_collection
from ..models.category import CategoryCreate, CategoryUpdate


async def get_all_categories() -> List[Dict[str, Any]]:
    """Get all categories"""
    collection = get_category_collection()
    categories = await collection.find().to_list(length=100)

    result = []
    for category in categories:
        category["id"] = str(category.pop("_id"))
        result.append(category)

    return result


async def get_category_by_id(category_id: str) -> Optional[Dict[str, Any]]:
    """Get a category by ID"""
    collection = get_category_collection()

    try:
        category = await collection.find_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    if not category:
        return None

    category["id"] = str(category.pop("_id"))
    return category


async def create_category(category: CategoryCreate) -> Dict[str, Any]:
    """Create a new category"""
    collection = get_category_collection()

    category_dict = category.model_dump()
    category_dict["created_at"] = datetime.now(UTC)

    result = await collection.insert_one(category_dict)
    created_category = await collection.find_one({"_id": result.inserted_id})
    created_category["id"] = str(created_category.pop("_id"))

    return created_category


async def update_category(category_id: str, category_update: CategoryUpdate) -> Optional[Dict[str, Any]]:
    """Update an existing category"""
    collection = get_category_collection()

    try:
        existing_category = await collection.find_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    if not existing_category:
        return None

    update_data = {k: v for k, v in category_update.model_dump(exclude_unset=True).items() if v is not None}

    if update_data:
        await collection.update_one(
            {"_id": ObjectId(category_id)},
            {"$set": update_data}
        )

    updated_category = await collection.find_one({"_id": ObjectId(category_id)})
    updated_category["id"] = str(updated_category.pop("_id"))

    return updated_category


async def delete_category(category_id: str) -> bool:
    """Delete a category"""
    collection = get_category_collection()

    try:
        result = await collection.delete_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    return result.deleted_count > 0