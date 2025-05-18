# app/backend/controllers/admin_controller.py
from fastapi import HTTPException, status
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

from ..utils.database import get_db


async def get_site_stats() -> Dict[str, Any]:
    db = get_db()

    # Get user count
    user_count = await db.users.count_documents({})

    # Get product count
    product_count = await db.products.count_documents({})

    # Get order count
    order_count = await db.orders.count_documents({})

    # Get review count
    review_count = await db.reviews.count_documents({})

    # Get total revenue
    orders = await db.orders.find().to_list(length=1000)
    total_revenue = sum(order.get("total_amount", 0) for order in orders)

    # Get recent orders
    recent_orders = await db.orders.find().sort("created_at", -1).limit(5).to_list(length=5)

    # Get recent users
    recent_users = await db.users.find({}, {"hashed_password": 0}).sort("created_at", -1).limit(5).to_list(length=5)

    # Get top selling products
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

    # Get sales data for chart (last 30 days)
    current_date = datetime.now(UTC)
    past_date = current_date - timedelta(days=30)

    pipeline = [
        {"$match": {"created_at": {"$gte": past_date}}},
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

    daily_sales = await db.orders.aggregate(pipeline).to_list(length=30)

    # Format daily sales for chart
    sales_data = []
    for day in daily_sales:
        date_str = f"{day['_id']['year']}-{day['_id']['month']:02d}-{day['_id']['day']:02d}"
        sales_data.append({
            "date": date_str,
            "total": day["total"],
            "count": day["count"]
        })

    return {
        "user_count": user_count,
        "product_count": product_count,
        "order_count": order_count,
        "review_count": review_count,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders,
        "recent_users": recent_users,
        "top_products": top_products,
        "sales_data": sales_data
    }


async def get_sales_stats(time_period: str = "week") -> Dict[str, Any]:
    db = get_db()

    # Determine date range based on time period
    current_date = datetime.now(UTC)

    if time_period == "day":
        start_date = datetime(current_date.year, current_date.month, current_date.day)
    elif time_period == "week":
        # Get the start of the current week (Monday)
        start_date = current_date - timedelta(days=current_date.weekday())
        start_date = datetime(start_date.year, start_date.month, start_date.day)
    elif time_period == "month":
        start_date = datetime(current_date.year, current_date.month, 1)
    elif time_period == "year":
        start_date = datetime(current_date.year, 1, 1)
    else:
        # Default to week if invalid period
        start_date = current_date - timedelta(days=current_date.weekday())
        start_date = datetime(start_date.year, start_date.month, start_date.day)

    # Get orders within the specified period
    orders = await db.orders.find({"created_at": {"$gte": start_date}}).to_list(length=1000)

    # Calculate total sales
    total_sales = sum(order.get("total_amount", 0) for order in orders)

    # Calculate order count
    order_count = len(orders)

    # Calculate average order value
    avg_order_value = total_sales / order_count if order_count > 0 else 0

    # Get product sales
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            product_id = item.get("product_id")
            if product_id in product_sales:
                product_sales[product_id]["quantity"] += item.get("quantity", 1)
                product_sales[product_id]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
            else:
                product_sales[product_id] = {
                    "product_id": product_id,
                    "product_name": item.get("product_name", "Unknown"),
                    "quantity": item.get("quantity", 1),
                    "revenue": item.get("price", 0) * item.get("quantity", 1)
                }

    return {
        "time_period": time_period,
        "total_sales": total_sales,
        "order_count": order_count,
        "avg_order_value": avg_order_value,
        "product_sales": list(product_sales.values())
    }


async def get_user_growth(months: int = 6) -> Dict[str, Any]:
    db = get_db()

    # Calculate start date (X months ago)
    current_date = datetime.now(UTC)
    start_date = current_date - timedelta(days=30 * months)

    # Initialize result structure
    result = {"total_users": await db.users.count_documents({}), "new_users": [], "growth_rate": 0}

    # Get total users

    # Get user registrations by month
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$created_at"},
                "month": {"$month": "$created_at"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]

    monthly_registrations = await db.users.aggregate(pipeline).to_list(length=months)

    # Format monthly registrations
    for month in monthly_registrations:
        date_str = f"{month['_id']['year']}-{month['_id']['month']:02d}"
        result["new_users"].append({
            "month": date_str,
            "count": month["count"]
        })

    # Calculate growth rate (comparing last month to the month before)
    if len(result["new_users"]) >= 2:
        last_month = result["new_users"][-1]["count"]
        previous_month = result["new_users"][-2]["count"]

        if previous_month > 0:
            result["growth_rate"] = (last_month - previous_month) / previous_month * 100

    return result


async def generate_sales_report(
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day"
) -> Dict[str, Any]:
    db = get_db()

    # Validate dates
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )

    # Define grouping format based on group_by parameter
    if group_by == "day":
        group_id = {
            "year": {"$year": "$created_at"},
            "month": {"$month": "$created_at"},
            "day": {"$dayOfMonth": "$created_at"}
        }
        date_format = "%Y-%m-%d"
    elif group_by == "week":
        group_id = {
            "year": {"$year": "$created_at"},
            "week": {"$week": "$created_at"}
        }
        date_format = "Year %Y, Week %V"
    elif group_by == "month":
        group_id = {
            "year": {"$year": "$created_at"},
            "month": {"$month": "$created_at"}
        }
        date_format = "%Y-%m"
    else:
        # Default to day if invalid group_by
        group_id = {
            "year": {"$year": "$created_at"},
            "month": {"$month": "$created_at"},
            "day": {"$dayOfMonth": "$created_at"}
        }
        date_format = "%Y-%m-%d"

    # Aggregate orders within date range
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {
            "_id": group_id,
            "total_sales": {"$sum": "$total_amount"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1 if group_by == "day" else -1}}
    ]

    sales_data = await db.orders.aggregate(pipeline).to_list(length=1000)

    # Format the results
    formatted_data = []
    for item in sales_data:
        if group_by == "day":
            date_str = f"{item['_id']['year']}-{item['_id']['month']:02d}-{item['_id']['day']:02d}"
        elif group_by == "week":
            date_str = f"Year {item['_id']['year']}, Week {item['_id']['week']}"
        elif group_by == "month":
            date_str = f"{item['_id']['year']}-{item['_id']['month']:02d}"

        formatted_data.append({
            "period": date_str,
            "total_sales": item["total_sales"],
            "order_count": item["order_count"],
            "average_order_value": item["total_sales"] / item["order_count"] if item["order_count"] > 0 else 0
        })

    # Calculate summary
    total_sales = sum(item["total_sales"] for item in formatted_data)
    total_orders = sum(item["order_count"] for item in formatted_data)

    return {
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "group_by": group_by,
        "total_sales": total_sales,
        "total_orders": total_orders,
        "average_order_value": total_sales / total_orders if total_orders > 0 else 0,
        "data": formatted_data
    }


async def generate_product_report(
        start_date: datetime,
        end_date: datetime,
        category_id: Optional[str] = None
) -> Dict[str, Any]:
    db = get_db()

    # Build match stage for pipeline
    match_stage = {"created_at": {"$gte": start_date, "$lte": end_date}}

    # Get all orders in the date range
    orders = await db.orders.find(match_stage).to_list(length=1000)

    # Process orders to get product stats
    product_stats = {}

    for order in orders:
        for item in order.get("items", []):
            product_id = item.get("product_id")

            # Skip if product is not in specified category (if category filter is applied)
            if category_id:
                product = await db.products.find_one({"id": product_id})
                if not product or product.get("category_id") != category_id:
                    continue

            # Add to stats
            if product_id in product_stats:
                product_stats[product_id]["quantity_sold"] += item.get("quantity", 1)
                product_stats[product_id]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
                product_stats[product_id]["order_count"] += 1
            else:
                product_stats[product_id] = {
                    "product_id": product_id,
                    "product_name": item.get("product_name", "Unknown"),
                    "quantity_sold": item.get("quantity", 1),
                    "revenue": item.get("price", 0) * item.get("quantity", 1),
                    "order_count": 1
                }

    # Convert to list and sort by revenue
    products_list = list(product_stats.values())
    products_list.sort(key=lambda x: x["revenue"], reverse=True)

    # Get category name if category filter is applied
    category_name = None
    if category_id:
        category = await db.categories.find_one({"id": category_id})
        category_name = category.get("name", "Unknown") if category else "Unknown"

    return {
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "category_id": category_id,
        "category_name": category_name,
        "total_products": len(products_list),
        "total_quantity_sold": sum(p["quantity_sold"] for p in products_list),
        "total_revenue": sum(p["revenue"] for p in products_list),
        "products": products_list
    }


async def generate_inventory_report() -> Dict[str, Any]:
    db = get_db()

    # Get all products
    products = await db.products.find().to_list(length=1000)

    # Process products to get inventory stats
    low_stock = []
    out_of_stock = []
    overstocked = []
    healthy_stock = []

    for product in products:
        stock = product.get("stock", 0)

        # Get product sales velocity (average daily sales over the last 30 days)
        pipeline = [
            {"$match": {
                "created_at": {"$gte": datetime.now(UTC) - timedelta(days=30)},
                "items.product_id": product["id"]
            }},
            {"$unwind": "$items"},
            {"$match": {"items.product_id": product["id"]}},
            {"$group": {
                "_id": None,
                "total_sold": {"$sum": "$items.quantity"}
            }}
        ]

        result = await db.orders.aggregate(pipeline).to_list(length=1)
        total_sold = result[0]["total_sold"] if result else 0

        # Calculate daily sales velocity
        daily_sales = total_sold / 30

        # Determine stock status based on sales velocity
        days_of_inventory = float('inf') if daily_sales == 0 else stock / daily_sales

        product_info = {
            "product_id": product["id"],
            "product_name": product["name"],
            "stock": stock,
            "daily_sales": daily_sales,
            "days_of_inventory": days_of_inventory
        }

        if stock == 0:
            out_of_stock.append(product_info)
        elif days_of_inventory < 7:
            low_stock.append(product_info)
        elif days_of_inventory > 90 and daily_sales > 0:
            overstocked.append(product_info)
        else:
            healthy_stock.append(product_info)

    return {
        "total_products": len(products),
        "out_of_stock_count": len(out_of_stock),
        "low_stock_count": len(low_stock),
        "overstocked_count": len(overstocked),
        "healthy_stock_count": len(healthy_stock),
        "out_of_stock": out_of_stock,
        "low_stock": low_stock,
        "overstocked": overstocked,
        "healthy_stock": healthy_stock
    }