# app/backend/controllers/admin_controller.py
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

from ..utils.database import get_db


def _start_of_period(period: str, current: datetime) -> datetime:
    """Helper to get start datetime for day/week/month/year."""
    if period == "day":
        return datetime(current.year, current.month, current.day, tzinfo=timezone.utc)
    if period == "week":
        start = current - timedelta(days=current.weekday())
        return datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
    if period == "month":
        return datetime(current.year, current.month, 1, tzinfo=timezone.utc)
    if period == "year":
        return datetime(current.year, 1, 1, tzinfo=timezone.utc)
    # default to week
    start = current - timedelta(days=current.weekday())
    return datetime(start.year, start.month, start.day, tzinfo=timezone.utc)


async def get_site_stats() -> Dict[str, Any]:

    db = get_db()

    # Counts
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    review_count = await db.reviews.count_documents({})
    pending_reports = await db.reports.count_documents({"status": "pending"})

    # Total revenue
    orders = await db.orders.find().to_list(length=1000)
    total_revenue = sum(o.get("total_amount", 0) for o in orders)

    # Recent entries
    recent_orders = await db.orders.find().sort("created_at", -1).limit(5).to_list(length=5)
    recent_users = await db.users.find({}, {"hashed_password": 0}).sort("created_at", -1).limit(5).to_list(length=5)

    # Top selling products
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "total_sold": {"$sum": "$items.quantity"},
            "product_name": {"$first": "$items.product_name"}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(pipeline).to_list(length=5)

    # Daily sales for last 30 days
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=30)
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
    daily = await db.orders.aggregate(pipeline).to_list(length=30)
    sales_data: List[Dict[str, Any]] = []
    for d in daily:
        date_str = f"{d['_id']['year']}-{d['_id']['month']:02d}-{d['_id']['day']:02d}"
        sales_data.append({"date": date_str, "total": d["total"], "count": d["count"]})

    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "review_count": review_count,
        "pending_reports": pending_reports,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders,
        "recent_users": recent_users,
        "top_products": top_products,
        "sales_data": sales_data
    }


async def get_sales_stats(time_period: str = "week") -> Dict[str, Any]:
    db = get_db()
    now = datetime.now(timezone.utc)
    start_date = _start_of_period(time_period, now)

    orders = await db.orders.find({"created_at": {"$gte": start_date}}).to_list(length=1000)
    total_sales = sum(o.get("total_amount", 0) for o in orders)
    order_count = len(orders)
    avg_order_value = total_sales / order_count if order_count else 0

    product_sales: Dict[str, Dict[str, Any]] = {}
    for o in orders:
        for item in o.get("items", []):
            pid = item.get("product_id")
            qty = item.get("quantity", 1)
            price = item.get("price", 0)
            if pid not in product_sales:
                product_sales[pid] = {"product_id": pid, "product_name": item.get("product_name"), "quantity": 0, "revenue": 0}
            product_sales[pid]["quantity"] += qty
            product_sales[pid]["revenue"] += price * qty

    return {"time_period": time_period, "total_sales": total_sales, "order_count": order_count,
            "avg_order_value": avg_order_value, "product_sales": list(product_sales.values())}


async def get_user_growth(months: int = 6) -> Dict[str, Any]:
    db = get_db()
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=30 * months)

    total_users = await db.users.count_documents({})
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    regs = await db.users.aggregate(pipeline).to_list(length=months)
    new_users: List[Dict[str, Any]] = []
    for r in regs:
        new_users.append({"month": f"{r['_id']['year']}-{r['_id']['month']:02d}", "count": r['count']})

    growth_rate = 0
    if len(new_users) >= 2 and new_users[-2]['count']:
        growth_rate = (new_users[-1]['count'] - new_users[-2]['count']) / new_users[-2]['count'] * 100

    return {"total_users": total_users, "new_users": new_users, "growth_rate": growth_rate}


async def generate_sales_report(
        start_date: datetime, end_date: datetime,
        group_by: str = "day"
) -> Dict[str, Any]:
    db = get_db()
    if start_date > end_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Start date must be before end date")

    keys = {
        "day": ("year", "month", "day"),
        "week": ("year", "week"),
        "month": ("year", "month")
    }
    group_fields = keys.get(group_by, keys["day"])
    group_id = {k: {"$" + k: "$created_at"} for k in group_fields}
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {"_id": group_id, "total_sales": {"$sum": "$total_amount"}, "order_count": {"$sum": 1}}},
        {"$sort": {"_id.year": 1}}
    ]

    data = await db.orders.aggregate(pipeline).to_list(length=1000)
    result = []
    for item in data:
        idd = item["_id"]
        if group_by == "day":
            period = f"{idd['year']}-{idd['month']:02d}-{idd['day']:02d}"
        elif group_by == "week":
            period = f"Year {idd['year']}, Week {idd['week']}"
        else:
            period = f"{idd['year']}-{idd['month']:02d}"
        result.append({"period": period, "total_sales": item['total_sales'], "order_count": item['order_count'],
                       "average_order_value": item['total_sales']/item['order_count'] if item['order_count'] else 0})

    total_sales = sum(x['total_sales'] for x in result)
    total_orders = sum(x['order_count'] for x in result)
    return {"start_date": start_date.strftime("%Y-%m-%d"), "end_date": end_date.strftime("%Y-%m-%d"),
            "group_by": group_by, "total_sales": total_sales, "total_orders": total_orders,
            "average_order_value": total_sales/total_orders if total_orders else 0, "data": result}


async def generate_product_report(
        start_date: datetime, end_date: datetime,
        category_id: Optional[str] = None
) -> Dict[str, Any]:
    db = get_db()
    match = {"created_at": {"$gte": start_date, "$lte": end_date}}
    orders = await db.orders.find(match).to_list(length=1000)

    stats: Dict[str, Dict[str, Any]] = {}
    for o in orders:
        for item in o.get("items", []):
            pid = item.get("product_id")
            if category_id:
                prod = await db.products.find_one({"_id": pid}, {"category_id": 1})
                if not prod or prod.get("category_id") != category_id:
                    continue
            qty = item.get("quantity", 1)
            rev = item.get("price", 0) * qty
            if pid not in stats:
                stats[pid] = {"product_id": pid, "product_name": item.get("product_name"),
                              "quantity_sold": 0, "revenue": 0, "order_count": 0}
            stats[pid]["quantity_sold"] += qty
            stats[pid]["revenue"] += rev
            stats[pid]["order_count"] += 1
    products = sorted(stats.values(), key=lambda x: x['revenue'], reverse=True)
    category_name = None
    if category_id:
        cat_doc = await db.categories.find_one({"_id": category_id})
        category_name = cat_doc.get("name") if cat_doc else None
    return {"start_date": start_date.strftime("%Y-%m-%d"), "end_date": end_date.strftime("%Y-%m-%d"),
            "category_id": category_id, "category_name": category_name, "total_products": len(products),
            "total_quantity_sold": sum(p['quantity_sold'] for p in products),
            "total_revenue": sum(p['revenue'] for p in products), "products": products}


async def generate_inventory_report() -> Dict[str, Any]:
    db = get_db()
    products = await db.products.find().to_list(length=1000)
    out_of_stock, low_stock, overstocked, healthy = [], [], [], []
    now = datetime.now(timezone.utc)
    for p in products:
        stock = p.get('stock', 0)
        pipeline = [
            {"$match": {"created_at": {"$gte": now - timedelta(days=30)}, "items.product_id": p['_id']}},
            {"$unwind": "$items"},
            {"$match": {"items.product_id": p['_id']}},
            {"$group": {"_id": None, "total_sold": {"$sum": "$items.quantity"}}}
        ]
        res = await db.orders.aggregate(pipeline).to_list(length=1)
        sold = res[0]['total_sold'] if res else 0
        daily_rate = sold / 30
        days_inv = float('inf') if daily_rate == 0 else stock / daily_rate
        info = {"product_id": p['_id'], "product_name": p.get('name'), "stock": stock,
                "daily_sales": daily_rate, "days_of_inventory": days_inv}
        if stock == 0:
            out_of_stock.append(info)
        elif days_inv < 7:
            low_stock.append(info)
        elif days_inv > 90:
            overstocked.append(info)
        else:
            healthy.append(info)
    return {"total_products": len(products), "out_of_stock_count": len(out_of_stock),
            "low_stock_count": len(low_stock), "overstocked_count": len(overstocked),
            "healthy_stock_count": len(healthy), "out_of_stock": out_of_stock,
            "low_stock": low_stock, "overstocked": overstocked, "healthy_stock": healthy}
