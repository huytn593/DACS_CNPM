# app/backend/routes/admin.py
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status, Query
from typing import List, Dict, Any

from app.backend.controllers import admin_controller, user_controller
from app.backend.utils import database
from app.backend.utils.auth import admin_required
from app.backend.models.user import UserResponse, UserUpdate
from app.backend.controllers.stats_controller import (
    dashboard_daily_orders,
    dashboard_top_products,
    dashboard_new_users,
    dashboard_revenue,
    dashboard_inventory
)

router = APIRouter(prefix="/admin", tags=["admin"])

async def get_site_stats():
    """Get site-wide statistics for admin dashboard"""
    db = database.get_db()

    # Get counts from collections
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_reports = await db.reports.count_documents({"status": "pending"})

    # Get revenue metrics
    revenue_pipeline = [
        {"$match": {"status": {"$nin": ["cancelled"]}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total"},
            "monthly_revenue": {
                "$sum": {
                    "$cond": [
                        {"$gte": ["$created_at", datetime.now(UTC) - timedelta(days=30)]},
                        "$total",
                        0
                    ]
                }
            }
        }}
    ]
    revenue_data = await db.orders.aggregate(revenue_pipeline).to_list(1)

    # Format response
    stats = {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_reports": pending_reports,
        "total_revenue": revenue_data[0]["total_revenue"] if revenue_data else 0,
        "monthly_revenue": revenue_data[0]["monthly_revenue"] if revenue_data else 0,
        # Add other statistics as needed
    }

    return stats

@router.get("/stats", response_model=Dict[str, Any])
async def get_admin_stats(_=Depends(admin_required)):
    return await admin_controller.get_site_stats()


@router.get("/stats/users", response_model=Dict[str, Any])
async def get_user_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "User statistics endpoint not implemented yet"}


@router.get("/stats/orders", response_model=Dict[str, Any])
async def get_order_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "Order statistics endpoint not implemented yet"}


@router.get("/stats/products", response_model=Dict[str, Any])
async def get_product_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "Product statistics endpoint not implemented yet"}


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
        _=Depends(admin_required),
        role: str = Query(None),
        query: str = Query(None),
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1, le=100)
):
    return await user_controller.get_users(role=role, query=query, page=page, size=size)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
        user_id: str = Path(...),
        _=Depends(admin_required)
):
    user = await user_controller.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
        user_id: str = Path(...),
        user_update: UserUpdate = Body(...),
        _=Depends(admin_required)
):
    updated_user = await user_controller.update_user(user_id, user_update)

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return updated_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user_id: str = Path(...),
        current_user=Depends(admin_required)
):
    # Prevent admin from deleting their own account
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )

    deleted = await user_controller.delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.get("/dashboard/daily-orders")
async def api_dashboard_daily_orders(days: int = 30):
    return await dashboard_daily_orders(days)

@router.get("/dashboard/top-products")
async def api_dashboard_top_products(limit: int = 5):
    return await dashboard_top_products(limit)

@router.get("/dashboard/new-users")
async def api_dashboard_new_users(months: int = 6):
    return await dashboard_new_users(months)

@router.get("/dashboard/revenue")
async def api_dashboard_revenue(days: int = 30):
    return await dashboard_revenue(days)

@router.get("/dashboard/inventory")
async def api_dashboard_inventory():
    return await dashboard_inventory()