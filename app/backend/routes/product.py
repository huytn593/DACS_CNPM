# app/backend/routes/products.py
from fastapi import APIRouter, Depends, Path, Query, Body, HTTPException, status
from typing import Optional
from app.backend.models.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.backend.controllers import product_controller
from app.backend.utils.auth import get_current_user, seller_required

router = APIRouter(tags=["products"])


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
        product: ProductCreate = Body(...),
        current_user=Depends(seller_required)
):
    return await product_controller.create_product(seller_id=current_user["id"], product_data=product)


@router.get("/products", response_model=ProductListResponse)
async def get_products(
        category: Optional[str] = Query(None, description="Filter by category"),
        min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
        max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
        search: Optional[str] = Query(None, description="Search query in name or description"),
        page: int = Query(1, ge=1, description="Page number"),
        size: int = Query(20, ge=1, le=100, description="Items per page")
):
    # Create a ProductSearchParams instance with the provided parameters
    from ..controllers.product_controller import ProductSearchParams

    search_params = ProductSearchParams(
        query=search,
        category_id=category,
        min_price=min_price,
        max_price=max_price,
        page=page,
        size=size
    )

    products = await product_controller.search_products(search_params)

    # Count total products for pagination
    total_count = len(products)  # This should actually be a separate count query
    total_pages = (total_count + size - 1) // size if total_count > 0 else 1

    return ProductListResponse(
        products=products,
        total=total_count,
        page=page,
        size=size,
        pages=total_pages
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str = Path(...)):
    product = await product_controller.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
        product_id: str = Path(...),
        product_update: ProductUpdate = Body(...),
):
    updated_product = await product_controller.update_product(
        product_id=product_id,
        product_update=product_update
    )

    if not updated_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to update it"
        )

    return updated_product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
        product_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    # Admin can delete any product
    if current_user["role"] == "admin":
        deleted = await product_controller.delete_product(product_id)
    # Seller can delete only their own products
    elif current_user["role"] == "seller":
        deleted = await product_controller.delete_product(product_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete products"
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to delete it"
        )