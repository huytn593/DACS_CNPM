# app/backend/routes/seller.py
from datetime import timedelta, datetime, UTC

from fastapi import APIRouter, Depends, Path, HTTPException, status, UploadFile, File, Form
from typing import List, Optional, Dict, Any

from app.backend.models.product import ProductResponse, ProductCreate, ProductUpdate
from app.backend.controllers import product_controller
from app.backend.controllers import seller_controller
from app.backend.utils.auth import seller_required
from app.backend.models.order import OrderResponse
from app.backend.controllers import order_controller
from app.backend.utils.file_upload import save_upload_files

router = APIRouter(prefix="/seller", tags=["seller"])


@router.get("/products", response_model=List[ProductResponse])
async def get_seller_products(current_user=Depends(seller_required)):
    return await seller_controller.get_seller_products(current_user["id"])


@router.post("/products", response_model=ProductResponse)
async def create_seller_product(
        name: str = Form(...),
        description: str = Form(...),
        price: float = Form(...),
        stock: int = Form(...),
        category_id: Optional[str] = Form(None),
        sku: Optional[str] = Form(None),
        active: bool = Form(True),
        images: List[UploadFile] = File([]),
        current_user=Depends(seller_required)
):
    # Upload images if provided
    image_paths = []
    if images:
        image_paths = await save_upload_files(images, "products")

    # Create product data
    product_data = ProductCreate(
        name=name,
        description=description,
        price=price,
        stock=stock,
        category_id=category_id,
        sku=sku,
        images=image_paths,
        active=active
    )

    # Create product
    return await product_controller.create_product(seller_id=current_user["id"], product_data=product_data)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_seller_product(
        product_id: str = Path(...),
        current_user=Depends(seller_required)
):
    product = await seller_controller.get_product_by_seller(product_id, current_user["id"])

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to access it"
        )

    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_seller_product(
        product_id: str = Path(...),
        name: Optional[str] = Form(None),
        description: Optional[str] = Form(None),
        price: Optional[float] = Form(None),
        stock: Optional[int] = Form(None),
        category_id: Optional[str] = Form(None),
        sku: Optional[str] = Form(None),
        active: Optional[bool] = Form(None),
        images: List[UploadFile] = File([]),
        current_user=Depends(seller_required)
):
    # Check if product exists and belongs to seller
    product = await seller_controller.get_product_by_seller(product_id, current_user["id"])

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to update it"
        )

    # Upload new images if provided
    image_paths = None
    if images and any(image.filename for image in images):
        image_paths = await save_upload_files(images, "products")

    # Create update data
    product_update = ProductUpdate(
        name=name,
        description=description,
        price=price,
        stock=stock,
        category_id=category_id,
        sku=sku,
        images=image_paths,
        active=active
    )

    # Update product
    return await product_controller.update_product(product_id=product_id, product_update=product_update)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seller_product(
        product_id: str = Path(...),
        current_user=Depends(seller_required)
):
    # Check if product exists and belongs to seller
    product = await seller_controller.get_product_by_seller(product_id, current_user["id"])

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to delete it"
        )

    # Delete product
    deleted = await product_controller.delete_product(product_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete product"
        )


@router.get("/orders", response_model=List[OrderResponse])
async def get_seller_orders(current_user=Depends(seller_required)):
    return await order_controller.get_seller_orders(current_user["id"])


@router.get("/stats/products-sold", response_model=Dict[str, Any])
async def get_products_sold(current_user=Depends(seller_required)):
    # Get all seller orders
    orders = await order_controller.get_seller_orders(current_user["id"])

    # Calculate total products sold
    total_sold = 0
    product_sold = {}

    for order in orders:
        for item in order.items:
            total_sold += item.quantity

            # Count by product
            if item.product_id in product_sold:
                product_sold[item.product_id]["quantity"] += item.quantity
                product_sold[item.product_id]["revenue"] += item.price * item.quantity
            else:
                product_sold[item.product_id] = {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "revenue": item.price * item.quantity
                }

    return {
        "total_sold": total_sold,
        "products": list(product_sold.values())
    }


@router.get("/stats/top-products", response_model=List[Dict[str, Any]])
async def get_top_products(current_user=Depends(seller_required)):
    # Get all seller orders
    orders = await order_controller.get_seller_orders(current_user["id"])

    # Calculate product sales
    product_sales = {}

    for order in orders:
        for item in order.items:
            if item.product_id in product_sales:
                product_sales[item.product_id]["quantity"] += item.quantity
                product_sales[item.product_id]["revenue"] += item.price * item.quantity
            else:
                product_sales[item.product_id] = {
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "revenue": item.price * item.quantity
                }

    # Sort by quantity sold
    top_products = sorted(
        product_sales.values(),
        key=lambda x: x["quantity"],
        reverse=True
    )

    return top_products[:5]  # Return top 5 products


@router.get("/stats/revenue", response_model=Dict[str, Any])
async def get_revenue(current_user=Depends(seller_required)):
    # Get all seller orders
    orders = await order_controller.get_seller_orders(current_user["id"])

    # Calculate total revenue
    total_revenue = 0

    for order in orders:
        for item in order.items:
            total_revenue += item.price * item.quantity

    # Calculate monthly revenue (last 6 months)
    monthly_revenue = {}
    now = datetime.now(UTC)

    for order in orders:
        # Skip orders older than 6 months
        if order.created_at < now - timedelta(days=180):
            continue

        # Get year and month
        year = order.created_at.year
        month = order.created_at.month
        key = f"{year}-{month:02d}"

        # Calculate revenue for this order
        order_revenue = sum(item.price * item.quantity for item in order.items)

        # Add to monthly revenue
        if key in monthly_revenue:
            monthly_revenue[key] += order_revenue
        else:
            monthly_revenue[key] = order_revenue

    # Convert to list of objects
    revenue_trend = [
        {"month": k, "revenue": v}
        for k, v in sorted(monthly_revenue.items())
    ]

    return {
        "total_revenue": total_revenue,
        "revenue_trend": revenue_trend
    }