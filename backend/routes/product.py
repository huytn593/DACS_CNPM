from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional
from ..models.product import ProductResponse, ReviewCreate, ReportCreate
from ..models.user import User
from ..controllers.product_controller import (
    get_products, 
    get_product_by_id, 
    search_products,
    add_product_review,
    report_product
)
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

@router.post("/products/{product_id}/review")
async def create_review(
    product_id: str,
    review: ReviewCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Thêm đánh giá cho sản phẩm (yêu cầu đăng nhập)
    """
    return await add_product_review(product_id, current_user["id"], review.rating, review.comment)

@router.post("/products/{product_id}/report")
async def create_report(
    product_id: str,
    report: ReportCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Báo cáo sản phẩm vi phạm (yêu cầu đăng nhập)
    """
    return await report_product(product_id, current_user["id"], report.description, report.reported_link)