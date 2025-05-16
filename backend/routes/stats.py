from fastapi import APIRouter, Depends, Query
from ..controllers.stats_controller import get_admin_sales_stats, get_seller_sales_stats
from ..utils.auth import admin_required, seller_required
from ..models.stats import SalesStats

router = APIRouter(tags=["statistics"])

@router.get("/admin/stats/sales", response_model=SalesStats)
async def admin_sales_stats(
    date_range: str = Query("week", enum=["day", "week", "month", "year"]),
    _=Depends(admin_required)
):
    """
    Lấy thống kê doanh số cho admin dashboard
    """
    return await get_admin_sales_stats(date_range)

@router.get("/seller/stats/sales", response_model=SalesStats)
async def seller_sales_stats(
    date_range: str = Query("week", enum=["day", "week", "month", "year"]),
    current_user=Depends(seller_required)
):
    """
    Lấy thống kê doanh số cho seller dashboard
    """
    return await get_seller_sales_stats(current_user["id"], date_range)