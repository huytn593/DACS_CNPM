from datetime import datetime, timedelta
import calendar
from ..utils.database import get_order_collection, get_product_collection, get_user_collection
from bson import ObjectId


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

    # Chuẩn bị dữ liệu cho từng khoảng thời gian
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


async def get_seller_sales_stats(seller_id: str, date_range: str):
    """Lấy thống kê doanh số của seller theo khoảng thời gian"""
    order_collection = get_order_collection()

    # Tương tự như trên nhưng lọc theo seller_id
    now = datetime.now()
    if date_range == "day":
        start_date = datetime(now.year, now.month, now.day)
        group_by = {"$dateToString": {"format": "%H", "date": "$created_at"}}
        labels = [f"{i}h" for i in range(24)]
        previous_start = start_date - timedelta(days=1)
    elif date_range == "week":
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

    # Pipeline cho dữ liệu hiện tại của seller
    pipeline = [
        {"$match": {
            "created_at": {"$gte": start_date},
            "seller_id": seller_id
        }},
        {"$group": {
            "_id": group_by,
            "total": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]

    current_data = await order_collection.aggregate(pipeline).to_list(length=None)

    # Chuyển đổi dữ liệu tương tự như trên
    chart_data = []
    current_data_dict = {item["_id"]: item["total"] for item in current_data}

    # Logic tương tự như trên
    # ...

    return {
        "date_range": date_range,
        "total_sales": total_sales,
        "chart_data": chart_data,
        "comparison_with_previous": comparison
    }