from fastapi import APIRouter, Depends, Query
from ..controllers.stats_controller import get_admin_sales_stats, get_seller_sales_stats
from ..utils.auth import get_admin_user, get_seller_user
from typing import Optional

router = APIRouter(tags=["statistics"])

@router.get("/admin/stats/sales")
async def admin_sales_stats(
    date_range: str = Query("week", enum=["day", "week", "month", "year"]),
    current_user=Depends(get_admin_user)
):
    """
    Lấy thống kê doanh số cho admin dashboard
    """
    return await get_admin_sales_stats(date_range)

@router.get("/seller/stats/sales")
async def seller_sales_stats(
    date_range: str = Query("week", enum=["day", "week", "month", "year"]),
    current_user=Depends(get_seller_user)
):
    """
    Lấy thống kê doanh số cho seller dashboard
    """
    return await get_seller_sales_stats(current_user["id"], date_range)