# app/backend/routes/products.py
from fastapi import APIRouter, Depends, Path, Query, Body, HTTPException, status
from typing import Optional
from app.backend.models.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.backend.controllers import product_controller
from app.backend.utils.auth import seller_required

router = APIRouter(tags=["products"])


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
        product: ProductCreate = Body(...),
        current_user=Depends(seller_required)
):
    return await product_controller.create_product(seller_id=current_user["id"], product_data=product)


@router.get("/products", response_model=ProductListResponse)
async def get_products(
        category_id: Optional[str] = Query(None),
        query: Optional[str] = Query(None),
        min_price: Optional[float] = Query(None),
        max_price: Optional[float] = Query(None),
        in_stock: Optional[bool] = Query(None),
        sort_by: Optional[str] = Query("newest"),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=100)
):
    search_params = product_controller.ProductSearchParams(
        category_id=category_id,
        query=query,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        sort_by=sort_by,
        page=page,
        size=size
    )
    return await product_controller.search_products(search_params)


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
        current_user=Depends(seller_required)
):
    # Check if product exists and belongs to seller
    product = await product_controller.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if product["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this product"
        )

    updated_product = await product_controller.update_product(
        product_id=product_id,
        product_update=product_update
    )

    return updated_product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
        product_id: str = Path(...),
        current_user=Depends(seller_required)
):
    # Check if product exists and belongs to seller
    product = await product_controller.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if product["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this product"
        )

    await product_controller.delete_product(product_id)