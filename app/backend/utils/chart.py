# Chart logic để tổng hợp dữ liệu
def daily_orders():
    # Trả về tổng đơn, sản phẩm bán chạy, khách hàng mới...
    pass

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from app.backend.utils.database import get_db

# Tổng hợp số đơn/ngày, doanh thu/ngày, sản phẩm bán chạy/ngày
async def get_daily_orders_stats(days: int = 30) -> List[Dict[str, Any]]:
    db = get_db()
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=days)
    pipeline = [
        {"$match": {"created_at": {"$gte": past}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"}
            },
            "total": {"$sum": "$total_amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    daily = await db.orders.aggregate(pipeline).to_list(length=days)
    stats = []
    for d in daily:
        date_str = f"{d['_id']['year']}-{d['_id']['month']:02d}-{d['_id']['day']:02d}"
        stats.append({"date": date_str, "total": d["total"], "count": d["count"]})
    return stats

# Sản phẩm bán chạy nhất theo doanh thu/số lượng
async def get_top_products(limit: int = 5) -> List[Dict[str, Any]]:
    db = get_db()
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "total_sold": {"$sum": "$items.quantity"},
            "product_name": {"$first": "$items.product_name"},
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": limit}
    ]
    top_products = await db.orders.aggregate(pipeline).to_list(length=limit)
    return top_products

# Số user/seller mới theo ngày/tháng
async def get_new_users_stats(months: int = 6) -> List[Dict[str, Any]]:
    db = get_db()
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30 * months)
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    regs = await db.users.aggregate(pipeline).to_list(length=months)
    new_users = []
    for r in regs:
        new_users.append({"month": f"{r['_id']['year']}-{r['_id']['month']:02d}", "count": r['count']})
    return new_users

# Doanh thu hệ thống, doanh thu seller, admin commission
async def get_revenue_stats(days: int = 30) -> Dict[str, Any]:
    db = get_db()
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=days)
    orders = await db.orders.find({"created_at": {"$gte": past}}).to_list(length=1000)
    total_revenue = sum(o.get("total_amount", 0) for o in orders)
    admin_commission = sum(o.get("admin_commission", 0) for o in orders)
    seller_revenue = sum(o.get("seller_amount", 0) for o in orders)
    return {
        "total_revenue": total_revenue,
        "admin_commission": admin_commission,
        "seller_revenue": seller_revenue
    }

# Sản phẩm tồn kho, sắp hết hàng, hết hàng
async def get_inventory_stats() -> Dict[str, Any]:
    db = get_db()
    products = await db.products.find().to_list(length=1000)
    out_of_stock = [p for p in products if p.get('stock', 0) == 0]
    low_stock = [p for p in products if 0 < p.get('stock', 0) < 10]
    healthy_stock = [p for p in products if p.get('stock', 0) >= 10]
    return {
        "total_products": len(products),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_count": len(low_stock),
        "healthy_stock_count": len(healthy_stock),
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "healthy_stock": healthy_stock
    }