# app/backend/routes/category.py
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status, Query
from typing import List

from app.backend.models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.backend.controllers import category_controller
from app.backend.utils.auth import admin_required
from app.backend.models.product import ProductListResponse

router = APIRouter(tags=["categories"])


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
        category: CategoryCreate = Body(...),
        _=Depends(admin_required)
):
    return await category_controller.create_category(category)


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories():
    return await category_controller.get_all_categories()


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str = Path(...)):
    category = await category_controller.get_category(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return category


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
        category_id: str = Path(...),
        category_update: CategoryUpdate = Body(...),
        _=Depends(admin_required)
):
    updated_category = await category_controller.update_category(category_id, category_update)

    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return updated_category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
        category_id: str = Path(...),
        _=Depends(admin_required)
):
    deleted = await category_controller.delete_category(category_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )


@router.get("/categories/{category_id}/products", response_model=ProductListResponse)
async def get_category_products(
        category_id: str = Path(...),
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1, le=100),
        sort_by: str = Query("created_at"),
        sort_order: int = Query(-1)
):
    from ..controllers import product_controller
    from ..controllers.product_controller import ProductSearchParams

    # Check if category exists
    category = await category_controller.get_category(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Map sort_by and sort_order to the expected format
    # If sort_order is -1, use "price_desc" or if 1, use "price_asc" for price
    # For other fields like created_at, we'll need to handle it differently
    if sort_by == "price":
        sort_param = "price_desc" if sort_order == -1 else "price_asc"
    elif sort_by == "created_at" and sort_order == -1:
        sort_param = "newest"
    else:
        # Default or pass as is
        sort_param = sort_by

    # Create ProductSearchParams object with the specified parameters
    search_params = ProductSearchParams(
        query="",
        category_id=category_id,
        page=page,
        size=size,
        sort_by=sort_param
    )

    # Search products in category
    return await product_controller.search_products(search_params)
