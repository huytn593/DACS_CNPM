# app/backend/controllers/category_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List, Optional

from ..models.category import CategoryCreate, CategoryUpdate, Category, CategoryResponse
from ..utils.database import get_db


async def get_categories():
    db = get_db()

    # Get categories with product counts
    pipeline = [
        {"$lookup": {
            "from": "products",
            "localField": "_id",
            "foreignField": "category_id",
            "as": "products"
        }},
        {"$addFields": {
            "product_count": {"$size": "$products"}
        }},
        {"$project": {
            "_id": 1,
            "id": {"$toString": "$_id"},  # Add id as string for convenience
            "name": 1,
            "description": 1,
            "icon": 1,
            "image": 1,
            "status": 1,
            "product_count": 1
        }}
    ]

    categories = await db.categories.aggregate(pipeline).to_list(100)
    return categories


async def get_category(category_id: str):
    db = get_db()

    category = await db.categories.find_one({"_id": category_id})
    if category:
        # Add id field and make sure _id is serializable
        category["id"] = str(category["_id"])
        # Count products for this category
        product_count = await db.products.count_documents({"category_id": category_id})
        category["product_count"] = product_count

    return category


async def create_category(category_data: CategoryCreate) -> CategoryResponse:
    db = get_db()

    # Create category ID
    category_id = str(uuid.uuid4())

    # Check if parent category exists if provided
    if category_data.parent_id:
        parent = await db.categories.find_one({"id": category_data.parent_id})
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )

    # Create category
    category = Category(
        id=category_id,
        **category_data.modeldump(),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.categories.insert_one(category.model_dump())

    # Get product count
    product_count = await db.products.count_documents({"category_id": category_id})

    return CategoryResponse(
        **category.model_dump(),
        product_count=product_count,
        subcategories=[]
    )

async def get_subcategories(parent_id: str) -> List[CategoryResponse]:
    db = get_db()

    # Get subcategories
    cursor = db.categories.find({"parent_id": parent_id})
    subcategories = await cursor.to_list(length=100)

    result = []

    for subcategory in subcategories:
        # Get product count
        product_count = await db.products.count_documents({"category_id": subcategory["id"]})

        # Get nested subcategories recursively
        nested_subcategories = await get_subcategories(subcategory["id"])

        result.append(
            CategoryResponse(
                **subcategory,
                product_count=product_count,
                subcategories=nested_subcategories
            )
        )

    return result


async def get_all_categories() -> List[CategoryResponse]:
    db = get_db()

    # Get top-level categories (no parent)
    cursor = db.categories.find({"parent_id": None})
    categories = await cursor.to_list(length=100)

    result = []

    for category in categories:
        # Get product count
        product_count = await db.products.count_documents({"category_id": category["id"]})

        # Get subcategories
        subcategories = await get_subcategories(category["id"])

        result.append(
            CategoryResponse(
                **category,
                product_count=product_count,
                subcategories=subcategories
            )
        )

    return result


async def update_category(category_id: str, category_update: CategoryUpdate) -> Optional[CategoryResponse]:
    db = get_db()

    # Get category
    category = await db.categories.find_one({"id": category_id})
    if not category:
        return None

    # Check if parent category exists if provided
    if category_update.parent_id:
        parent = await db.categories.find_one({"id": category_update.parent_id})
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )

        # Check for circular reference
        if category_update.parent_id == category_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category cannot be its own parent"
            )

    # Prepare update data
    update_data = {k: v for k, v in category_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)

    # Update category
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})

    # Get updated category
    updated_category = await db.categories.find_one({"id": category_id})

    # Get product count
    product_count = await db.products.count_documents({"category_id": category_id})

    # Get subcategories
    subcategories = await get_subcategories(category_id)

    return CategoryResponse(
        **updated_category,
        product_count=product_count,
        subcategories=subcategories
    )


async def delete_category(category_id: str) -> bool:
    db = get_db()

    # Check if category has subcategories
    subcategory_count = await db.categories.count_documents({"parent_id": category_id})
    if subcategory_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with subcategories"
        )

    # Check if category has products
    product_count = await db.products.count_documents({"category_id": category_id})
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with products"
        )

    # Delete category
    result = await db.categories.delete_one({"id": category_id})

    return result.deleted_count > 0