# backend/routes/category.py

from fastapi import APIRouter, Depends, Path, Body, HTTPException, status
from typing import List, Dict, Any

from ..models.category import CategoryCreate, CategoryUpdate
from ..controllers import category_controller
from ..utils.auth import admin_required

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=List[Dict[str, Any]])
async def get_categories():
    """
    Get all categories
    """
    return await category_controller.get_all_categories()


@router.get("/categories/{category_id}")
async def get_category(category_id: str = Path(...)):
    """
    Get a specific category by ID
    """
    category = await category_controller.get_category_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.post("/admin/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
        category: CategoryCreate = Body(...),
        _=Depends(admin_required)
):
    """
    Create a new category (admin only)
    """
    return await category_controller.create_category(category)


@router.put("/admin/categories/{category_id}")
async def update_category(
        category_id: str = Path(...),
        category_update: CategoryUpdate = Body(...),
        _=Depends(admin_required)
):
    """
    Update a product category (admin only)
    """
    updated_category = await category_controller.update_category(
        category_id=category_id,
        category_update=category_update
    )

    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return updated_category


@router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
        category_id: str = Path(...),
        _=Depends(admin_required)
):
    """
    Delete a category (admin only)
    """
    deleted = await category_controller.delete_category(category_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )