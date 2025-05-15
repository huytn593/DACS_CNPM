from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class ChartDataPoint(BaseModel):
    label: str
    value: float


class SalesStats(BaseModel):
    date_range: str
    total_sales: float
    chart_data: List[ChartDataPoint]
    comparison_with_previous: Optional[float] = None


class DashboardStats(BaseModel):
    total_orders: int
    total_sales: float
    total_customers: int
    total_products: int
    recent_orders: List[Dict[str, Any]]
    top_selling_products: List[Dict[str, Any]]


class SellerDashboardStats(BaseModel):
    total_orders: int
    total_sales: float
    total_products: int
    recent_orders: List[Dict[str, Any]]
    top_selling_products: List[Dict[str, Any]]