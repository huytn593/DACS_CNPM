import calendar
from fastapi import HTTPException, status
from bson import ObjectId
from typing import Optional
from datetime import datetime, UTC, timedelta
from ..utils.database import get_user_collection, get_product_collection, get_order_collection, get_category_collection, get_report_collection
from ..models.product import ProductCreate, ProductUpdate
from ..models.order import OrderUpdate


# Định nghĩa OrderStatus nếu không có trong order.py
class OrderStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# Định nghĩa UserRole nếu không có trong user.py
class UserRole:
    USER = "user"
    SELLER = "seller"
    ADMIN = "admin"


# Product Management Functions
async def get_all_products(skip: int = 0, limit: int = 100, category: Optional[str] = None):
    """
    Get all products with optional filtering by category
    """
    product_collection = get_product_collection()

    # Build filter criteria
    filter_criteria = {}
    if category:
        filter_criteria["category"] = category

    # Get products
    products = await product_collection.find(
        filter_criteria,
        skip=skip,
        limit=limit
    ).to_list(length=limit)

    # Convert ObjectId to string
    for product in products:
        product["id"] = str(product.pop("_id"))

    return products


async def create_product(product_data: ProductCreate):
    """
    Create a new product
    """
    product_collection = get_product_collection()

    # Format the data for insertion
    # Sử dụng model_dump() thay cho dict()
    product_dict = product_data.model_dump()
    product_dict["created_at"] = datetime.now(UTC)
    product_dict["updated_at"] = datetime.now(UTC)

    # Insert product
    result = await product_collection.insert_one(product_dict)

    # Get the created product
    created_product = await product_collection.find_one({"_id": result.inserted_id})
    created_product["id"] = str(created_product.pop("_id"))

    return created_product


async def update_product(product_id: str, product_data: ProductUpdate):
    """
    Update an existing product
    """
    product_collection = get_product_collection()

    # Check if product exists
    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Prepare update data (exclude unset fields)
    # Sử dụng model_dump() thay cho dict()
    update_data = {
        k: v for k, v in product_data.model_dump(exclude_unset=True).items()
        if v is not None
    }
    update_data["updated_at"] = datetime.now(UTC)

    # Update product
    await product_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )

    # Get the updated product
    updated_product = await product_collection.find_one({"_id": ObjectId(product_id)})
    updated_product["id"] = str(updated_product.pop("_id"))

    return updated_product


async def delete_product(product_id: str):
    """
    Delete a product
    """
    product_collection = get_product_collection()

    # Check if product exists
    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Delete product
    await product_collection.delete_one({"_id": ObjectId(product_id)})

    return {"message": "Product deleted successfully"}


# Order Management Functions
async def get_all_orders(
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,  # Đổi tên biến để tránh trùng
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
):
    """
    Get all orders with optional filtering
    """
    order_collection = get_order_collection()

    # Build filter criteria
    filter_criteria = {}
    if status_filter:  # Sử dụng tên biến mới
        filter_criteria["status"] = status_filter

    if from_date:
        filter_criteria["created_at"] = {"$gte": from_date}

    if to_date:
        if "created_at" in filter_criteria:
            filter_criteria["created_at"]["$lte"] = to_date
        else:
            filter_criteria["created_at"] = {"$lte": to_date}

    # Get orders
    orders = await order_collection.find(
        filter_criteria,
        skip=skip,
        limit=limit
    ).sort([("created_at", -1)]).to_list(length=limit)

    # Convert ObjectId to string
    for order in orders:
        order["id"] = str(order.pop("_id"))
        order["user_id"] = str(order["user_id"])

        # Convert item's ObjectId to string if items exist
        if "items" in order:
            for item in order["items"]:
                if "_id" in item:
                    item["id"] = str(item.pop("_id"))

                item["product_id"] = str(item["product_id"])

    return orders


async def update_order_status(order_id: str, order_update: OrderUpdate):
    """
    Update the status of an order
    """
    order_collection = get_order_collection()

    # Check if order exists
    order = await order_collection.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Prepare update data
    # Sử dụng model_dump() thay cho dict()
    update_data = {
        k: v for k, v in order_update.model_dump(exclude_unset=True).items()
        if v is not None
    }

    # Add appropriate date fields based on status change
    if "status" in update_data:
        status_value = update_data["status"]  # Đổi tên biến để tránh trùng
        if status_value == OrderStatus.PROCESSING:
            update_data["processing_date"] = datetime.now(UTC)
        elif status_value == OrderStatus.SHIPPED:
            update_data["shipped_date"] = datetime.now(UTC)
        elif status_value == OrderStatus.DELIVERED:
            update_data["delivered_date"] = datetime.now(UTC)
        elif status_value == OrderStatus.CANCELLED:
            update_data["cancelled_date"] = datetime.now(UTC)

    # Update order status
    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )

    # Get the updated order
    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    updated_order["id"] = str(updated_order.pop("_id"))
    updated_order["user_id"] = str(updated_order["user_id"])

    # Convert item's ObjectId to string if items exist
    if "items" in updated_order:
        for item in updated_order["items"]:
            if "_id" in item:
                item["id"] = str(item.pop("_id"))

            item["product_id"] = str(item["product_id"])

    return updated_order


# User Management Functions
async def get_all_users(skip: int = 0, limit: int = 100, role: Optional[str] = None):
    """
    Get all users with optional filtering by role
    """
    user_collection = get_user_collection()

    # Build filter criteria
    filter_criteria = {}
    if role:
        filter_criteria["role"] = role

    # Get users
    users = await user_collection.find(
        filter_criteria,
        skip=skip,
        limit=limit
    ).to_list(length=limit)

    # Convert ObjectId to string
    for user in users:
        user["id"] = str(user.pop("_id"))

    return users


async def update_user_role(user_id: str, role: str):
    """
    Update a user's role
    """
    user_collection = get_user_collection()

    # Check if user exists
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update user role
    await user_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role}}
    )

    # Get the updated user
    updated_user = await user_collection.find_one({"_id": ObjectId(user_id)})
    updated_user["id"] = str(updated_user.pop("_id"))

    return updated_user


async def delete_user(user_id: str):
    """
    Delete a user
    """
    user_collection = get_user_collection()

    # Check if user exists
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Delete user
    await user_collection.delete_one({"_id": ObjectId(user_id)})

    return {"message": "User deleted successfully"}


# Category Management Functions
async def get_all_categories():
    """
    Get all product categories
    """
    category_collection = get_category_collection()

    categories = await category_collection.find().to_list(length=100)

    # Convert ObjectId to string
    for category in categories:
        category["id"] = str(category.pop("_id"))

    return categories


async def add_category(name: str, description: Optional[str] = None):
    """
    Add a new product category
    """
    category_collection = get_category_collection()

    # Check if category already exists
    existing_category = await category_collection.find_one({"name": name})
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists"
        )

    # Create category
    category_data = {
        "name": name,
        "description": description,
        "created_at": datetime.now(UTC)
    }

    result = await category_collection.insert_one(category_data)

    # Get the created category
    created_category = await category_collection.find_one({"_id": result.inserted_id})
    created_category["id"] = str(created_category.pop("_id"))

    return created_category


async def update_category(category_id: str, name: Optional[str] = None, description: Optional[str] = None):
    """
    Update a product category
    """
    category_collection = get_category_collection()

    # Check if category exists
    category = await category_collection.find_one({"_id": ObjectId(category_id)})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Prepare update data
    update_data = {}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description

    # Update category
    await category_collection.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )

    # Get the updated category
    updated_category = await category_collection.find_one({"_id": ObjectId(category_id)})
    updated_category["id"] = str(updated_category.pop("_id"))

    return updated_category


async def delete_category(category_id: str):
    """
    Delete a product category
    """
    category_collection = get_category_collection()
    product_collection = get_product_collection()

    # Check if category exists
    category = await category_collection.find_one({"_id": ObjectId(category_id)})
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if there are products with this category
    products_with_category = await product_collection.count_documents({"category": category["name"]})
    if products_with_category > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category. {products_with_category} products are in this category."
        )

    # Delete category
    await category_collection.delete_one({"_id": ObjectId(category_id)})

    return {"message": "Category deleted successfully"}


# Dashboard Functions
async def get_dashboard_stats():
    """
    Get statistics for admin dashboard
    """
    user_collection = get_user_collection()
    product_collection = get_product_collection()
    order_collection = get_order_collection()

    # Get total users
    total_users = await user_collection.count_documents({})

    # Get total products
    total_products = await product_collection.count_documents({})

    # Get total orders
    total_orders = await order_collection.count_documents({})

    # Get revenue (sum of completed order totals)
    pipeline = [
        {"$match": {"status": {"$in": ["delivered", "shipped"]}}},
        {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await order_collection.aggregate(pipeline).to_list(length=1)
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0

    # Get order count by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await order_collection.aggregate(pipeline).to_list(length=None)

    orders_by_status = {item["_id"]: item["count"] for item in status_counts}

    # Get recent orders
    recent_orders = await order_collection.find().sort([("created_at", -1)]).limit(5).to_list(length=5)

    # Convert ObjectId to string in recent orders
    for order in recent_orders:
        order["id"] = str(order.pop("_id"))
        order["user_id"] = str(order["user_id"])

    # Get low stock products (less than 10 in stock)
    low_stock_products = await product_collection.find({"stock": {"$lt": 10}}).limit(5).to_list(length=5)

    # Convert ObjectId to string in low stock products
    for product in low_stock_products:
        product["id"] = str(product.pop("_id"))

    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "orders_by_status": orders_by_status,
        "recent_orders": recent_orders,
        "low_stock_products": low_stock_products
    }

async def get_admin_dashboard_stats():
    """Lấy thống kê tổng quan cho admin dashboard"""
    order_collection = get_order_collection()
    user_collection = get_user_collection()
    product_collection = get_product_collection()

    # Đếm tổng số đơn hàng
    total_orders = await order_collection.count_documents({})

    # Tính tổng doanh số
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    result = await order_collection.aggregate(pipeline).to_list(1)
    total_sales = result[0]["total"] if result else 0

    # Đếm tổng số khách hàng
    total_customers = await user_collection.count_documents({"role": "user"})

    # Đếm tổng số sản phẩm
    total_products = await product_collection.count_documents({})

    # Lấy đơn hàng gần đây
    recent_orders = await order_collection.find().sort("created_at", -1).limit(5).to_list(5)

    # Lấy sản phẩm bán chạy
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "total_sold": {"$sum": "$items.quantity"}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_selling_ids = await order_collection.aggregate(pipeline).to_list(5)

    # Lấy thông tin sản phẩm đầy đủ
    top_selling_products = []
    for item in top_selling_ids:
        product = await product_collection.find_one({"_id": ObjectId(item["_id"])})
        if product:
            product["id"] = str(product.pop("_id"))
            product["total_sold"] = item["total_sold"]
            top_selling_products.append(product)

    return {
        "total_orders": total_orders,
        "total_sales": total_sales,
        "total_customers": total_customers,
        "total_products": total_products,
        "recent_orders": recent_orders,
        "top_selling_products": top_selling_products
    }


async def get_admin_sales_stats(date_range: str):
    """Lấy thống kê doanh số theo khoảng thời gian"""
    order_collection = get_order_collection()

    # Xác định khoảng thời gian
    now = datetime.now()
    if date_range == "day":
        start_date = datetime(now.year, now.month, now.day)
        group_by = {"$dateToString": {"format": "%H", "date": "$created_at"}}
        labels = [f"{i}h" for i in range(24)]
        previous_start = start_date - timedelta(days=1)

    elif date_range == "week":
        # Lấy ngày đầu tuần (thứ 2)
        start_date = now - timedelta(days=now.weekday())
        start_date = datetime(start_date.year, start_date.month, start_date.day)
        group_by = {"$dateToString": {"format": "%u", "date": "$created_at"}}
        labels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
        previous_start = start_date - timedelta(days=7)

    elif date_range == "month":
        start_date = datetime(now.year, now.month, 1)
        group_by = {"$dateToString": {"format": "%d", "date": "$created_at"}}
        last_day = calendar.monthrange(now.year, now.month)[1]
        labels = [str(i) for i in range(1, last_day + 1)]
        if now.month == 1:
            previous_start = datetime(now.year - 1, 12, 1)
        else:
            previous_start = datetime(now.year, now.month - 1, 1)

    else:  # year
        start_date = datetime(now.year, 1, 1)
        group_by = {"$dateToString": {"format": "%m", "date": "$created_at"}}
        labels = ["Tháng " + str(i) for i in range(1, 13)]
        previous_start = datetime(now.year - 1, 1, 1)

    # Pipeline cho dữ liệu hiện tại
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": group_by,
            "total": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]

    current_data = await order_collection.aggregate(pipeline).to_list(length=None)

    # Chuyển đổi dữ liệu sang định dạng chart
    chart_data = []
    current_data_dict = {item["_id"]: item["total"] for item in current_data}

    if date_range == "day":
        for hour in range(24):
            label = f"{hour}h"
            value = current_data_dict.get(f"{hour:02d}", 0)
            chart_data.append({"label": label, "value": value})

    elif date_range == "week":
        for day in range(1, 8):  # 1-7 for Monday to Sunday
            label = labels[day - 1]
            value = current_data_dict.get(f"{day}", 0)
            chart_data.append({"label": label, "value": value})

    elif date_range == "month":
        for day in range(1, len(labels) + 1):
            label = str(day)
            value = current_data_dict.get(f"{day:02d}", 0)
            chart_data.append({"label": label, "value": value})

    else:  # year
        for month in range(1, 13):
            label = f"Tháng {month}"
            value = current_data_dict.get(f"{month:02d}", 0)
            chart_data.append({"label": label, "value": value})

    # Tính tổng doanh số hiện tại
    total_sales = sum(item["value"] for item in chart_data)

    # Tính doanh số kỳ trước để so sánh
    previous_end = start_date
    previous_pipeline = [
        {"$match": {"created_at": {"$gte": previous_start, "$lt": previous_end}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$total_amount"}
        }}
    ]

    previous_result = await order_collection.aggregate(previous_pipeline).to_list(1)
    previous_total = previous_result[0]["total"] if previous_result else 0

    # Tính phần trăm thay đổi
    comparison = None
    if previous_total > 0:
        comparison = ((total_sales - previous_total) / previous_total) * 100

    return {
        "date_range": date_range,
        "total_sales": total_sales,
        "chart_data": chart_data,
        "comparison_with_previous": comparison
    }