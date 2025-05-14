from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from typing import List, Optional
from datetime import datetime

from ..controllers.admin_controller import (
    get_all_products,
    create_product,
    update_product,
    delete_product,
    get_all_orders,
    update_order_status,
    get_all_users,
    update_user_role,
    delete_user,
    get_all_categories,
    add_category,
    update_category,
    delete_category,
    get_dashboard_stats
)
from ..models.product import ProductCreate, ProductUpdate, ProductResponse
from ..models.order import OrderStatus, OrderUpdate, OrderResponse as Order
from ..models.user import User, UserRole
from ..models.category import CategoryCreate, CategoryUpdate, CategoryResponse
from ..utils.auth import get_current_user, admin_required

router = APIRouter(prefix="/api/admin", tags=["admin"])


# Dashboard
@router.get("/dashboard")
async def get_admin_dashboard(current_user: User = Depends(admin_required)):
    """
    Get admin dashboard statistics
    """
    return await get_dashboard_stats()

# Product Management
@router.get("/products", response_model=List[ProductResponse])
async def admin_get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(admin_required)
):
    """
    Get all products with pagination and optional category filter
    """
    return await get_all_products(skip=skip, limit=limit, category=category)

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_product(
    product: ProductCreate,
    current_user: User = Depends(admin_required)
):
    """
    Create a new product
    """
    return await create_product(product)

@router.put("/products/{product_id}", response_model=ProductResponse)
async def admin_update_product(
    product_id: str = Path(...),
    product: ProductUpdate = Body(...),
    current_user: User = Depends(admin_required)
):
    """
    Update an existing product
    """
    return await update_product(product_id, product)

@router.delete("/products/{product_id}")
async def admin_delete_product(
    product_id: str = Path(...),
    current_user: User = Depends(admin_required)
):
    """
    Delete a product
    """
    return await delete_product(product_id)

# Order Management
@router.get("/orders", response_model=List[Order])
async def admin_get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    current_user: User = Depends(admin_required)
):
    """
    Get all orders with pagination and optional filters
    """
    return await get_all_orders(
        skip=skip,
        limit=limit,
        status=status,
        from_date=from_date,
        to_date=to_date
    )

@router.put("/orders/{order_id}", response_model=Order)
async def admin_update_order(
    order_id: str = Path(...),
    order_update: OrderUpdate = Body(...),
    current_user: User = Depends(admin_required)
):
    """
    Update order status
    """
    return await update_order_status(order_id, order_update)

# User Management
@router.get("/users", response_model=List[User])
async def admin_get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    role: Optional[str] = None,
    current_user: User = Depends(admin_required)
):
    """
    Get all users with pagination and optional role filter
    """
    return await get_all_users(skip=skip, limit=limit, role=role)

@router.put("/users/{user_id}/role")
async def admin_update_user_role(
    user_id: str = Path(...),
    role: UserRole = Body(...),
    current_user: User = Depends(admin_required)
):
    """
    Update a user's role
    """
    return await update_user_role(user_id, role)

@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str = Path(...),
    current_user: User = Depends(admin_required)
):
    """
    Delete a user
    """
    return await delete_user(user_id)

# Category Management
@router.get("/categories", response_model=List[CategoryResponse])
async def admin_get_categories(current_user: User = Depends(admin_required)):
    """
    Get all product categories
    """
    return await get_all_categories()

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_category(
    category: CategoryCreate,
    current_user: User = Depends(admin_required)
):
    """
    Create a new product category
    """
    return await add_category(name=category.name, description=category.description)

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def admin_update_category(
    category_id: str = Path(...),
    category: CategoryUpdate = Body(...),
    current_user: User = Depends(admin_required)
):
    """
    Update a product category
    """
    return await update_category(
        category_id=category_id,
        name=category.name,
        description=category.description
    )

@router.delete("/categories/{category_id}")
async def admin_delete_category(
    category_id: str = Path(...),
    current_user: User = Depends(admin_required)
):
    """
    Delete a product category
    """
    return await delete_category(category_id)