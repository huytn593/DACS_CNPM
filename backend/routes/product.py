from fastapi import APIRouter, Depends, HTTPException, status as http_status, Path, Query, Body
from typing import List, Optional
from ..models.product import ProductResponse
from ..controllers.product_controller import (
    get_products,
    get_product_by_id,
    search_products,
)
from ..controllers import review_controller
from ..models.review import ReviewCreate, ReviewResponse
from ..models.report import ProductReportCreate, ProductReportResponse, ProductReportUpdate
from ..utils.auth import get_current_user

router = APIRouter(tags=["products"])


@router.get("/products", response_model=List[ProductResponse])
async def list_products(
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: str = Query("created_at", description="Field to sort by"),
        sort_order: int = Query(-1, description="Sort order: 1 for ascending, -1 for descending"),
        limit: int = Query(20, description="Number of products to return"),
        skip: int = Query(0, description="Number of products to skip")
):
    """
    Lấy danh sách sản phẩm với các bộ lọc
    """
    return await get_products(category, min_price, max_price, sort_by, sort_order, limit, skip)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """
    Lấy chi tiết sản phẩm theo ID
    """
    return await get_product_by_id(product_id)


@router.get("/products/search", response_model=List[ProductResponse])
async def search(
        query: str,
        limit: int = Query(20, description="Number of products to return"),
        skip: int = Query(0, description="Number of products to skip")
):
    """
    Tìm kiếm sản phẩm theo từ khóa
    """
    return await search_products(query, limit, skip)


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse)
async def create_review(
        product_id: str = Path(...),
        review_data: ReviewCreate = Body(...),
        current_user=Depends(get_current_user)
):
    """Add a review for a product"""
    return await review_controller.add_product_review(
        user_id=current_user["id"],
        product_id=product_id,
        review_data=review_data
    )


@router.get("/products/{product_id}/reviews", response_model=dict)
async def get_reviews(
        product_id: str = Path(...),
        page: int = Query(1, ge=1),
        limit: int = Query(10, ge=1, le=100)
):
    """Get reviews for a product"""
    reviews, total = await review_controller.get_product_reviews(
        product_id=product_id,
        page=page,
        limit=limit
    )
    return {
        "items": reviews,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.post("/products/{product_id}/report", response_model=ProductReportResponse)
async def report_product(
        product_id: str = Path(...),
        report_data: ProductReportCreate = Body(...),
        current_user=Depends(get_current_user)
):
    """Report a product"""
    from ..controllers.report_controller import create_product_report

    return await create_product_report(
        user_id=current_user["id"],
        product_id=product_id,
        report_data=report_data
    )


@router.get("/admin/reports", response_model=dict)
async def get_reports(
        page: int = Query(1, ge=1),
        limit: int = Query(10, ge=1, le=100),
        report_status: Optional[str] = None,  # Renamed from 'status' to avoid shadowing
        product_id: Optional[str] = None,
        current_user=Depends(get_current_user)
):
    """Get product reports (admin only)"""
    from ..controllers.report_controller import get_product_reports

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    reports, total = await get_product_reports(
        user_role=current_user["role"],
        page=page,
        limit=limit,
        status_filter=report_status,  # Use the renamed parameter
        product_id=product_id
    )

    return {
        "items": reports,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.put("/admin/reports/{report_id}", response_model=ProductReportResponse)
async def update_report(
        report_id: str = Path(...),
        update_data: ProductReportUpdate = Body(...),  # Changed to Body and made required
        current_user=Depends(get_current_user)
):
    """Update report status (admin only)"""
    from ..controllers.report_controller import update_report_status

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update reports"
        )

    return await update_report_status(
        report_id=report_id,
        status=update_data.status,
        user_role=current_user["role"]
    )