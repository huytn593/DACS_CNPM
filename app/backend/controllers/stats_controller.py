# app/backend/controllers/stats_controller.py
from typing import Dict, Any

from .admin_controller import get_sales_stats, get_user_growth

async def get_sales_stats_wrapper(time_period: str = "week") -> Dict[str, Any]:
    """Wrapper function that forwards to admin_controller.get_sales_stats"""
    return await get_sales_stats(time_period)

async def get_user_growth_wrapper(months: int = 6) -> Dict[str, Any]:
    """Wrapper function that forwards to admin_controller.get_user_growth"""
    return await get_user_growth(months)