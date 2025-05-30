# app/backend/controllers/stats_controller.py
from typing import Dict, Any, List
from .admin_controller import get_sales_stats, get_user_growth
from app.backend.utils.chart import (
    get_daily_orders_stats,
    get_top_products,
    get_new_users_stats,
    get_revenue_stats,
    get_inventory_stats
)

async def get_sales_stats_wrapper(time_period: str = "week") -> Dict[str, Any]:
    """Wrapper function that forwards to admin_controller.get_sales_stats"""
    return await get_sales_stats(time_period)

async def get_user_growth_wrapper(months: int = 6) -> Dict[str, Any]:
    """Wrapper function that forwards to admin_controller.get_user_growth"""
    return await get_user_growth(months)

# Dashboard API wrappers
async def dashboard_daily_orders(days: int = 30) -> List[Dict[str, Any]]:
    return await get_daily_orders_stats(days)

async def dashboard_top_products(limit: int = 5) -> List[Dict[str, Any]]:
    return await get_top_products(limit)

async def dashboard_new_users(months: int = 6) -> List[Dict[str, Any]]:
    return await get_new_users_stats(months)

async def dashboard_revenue(days: int = 30) -> Dict[str, Any]:
    return await get_revenue_stats(days)

async def dashboard_inventory() -> Dict[str, Any]:
    return await get_inventory_stats()