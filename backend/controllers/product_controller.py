from fastapi import HTTPException, status
from ..utils.database import get_product_collection, get_review_collection, get_report_collection
from bson import ObjectId
from typing import List, Optional
from datetime import datetime, UTC


async def get_products(
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        sort_by: str = "created_at",
        sort_order: int = -1,
        limit: int = 20,
        skip: int = 0
):
    """
    Lấy danh sách sản phẩm với các bộ lọc
    """
    product_collection = get_product_collection()

    # Xây dựng filter query
    filter_query = {}

    if category:
        filter_query["category"] = category

    # Lọc theo giá
    if min_price is not None or max_price is not None:
        price_filter = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price

        if price_filter:
            filter_query["price"] = price_filter

    # Thực hiện truy vấn
    cursor = product_collection.find(filter_query)

    # Sắp xếp kết quả
    cursor = cursor.sort(sort_by, sort_order)

    # Phân trang
    cursor = cursor.skip(skip).limit(limit)

    # Chuyển đổi kết quả về dạng list
    products = await cursor.to_list(length=limit)

    # Chuyển đổi ObjectId thành str
    for product in products:
        product["id"] = str(product.pop("_id"))

    return products


async def get_product_by_id(product_id: str):
    """
    Lấy thông tin chi tiết sản phẩm theo ID
    """
    product_collection = get_product_collection()

    try:
        product = await product_collection.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Chuyển đổi ObjectId thành str
    product["id"] = str(product.pop("_id"))

    # Lấy đánh giá của sản phẩm
    review_collection = get_review_collection()
    reviews = await review_collection.find({"product_id": product_id}).to_list(length=100)

    # Chuyển đổi ObjectId trong đánh giá thành str
    for review in reviews:
        review["id"] = str(review.pop("_id"))

    product["reviews"] = reviews

    return product


async def search_products(query: str, limit: int = 20, skip: int = 0):
    """
    Tìm kiếm sản phẩm theo từ khóa (tên và mô tả)
    """
    product_collection = get_product_collection()

    # Sử dụng text index (cần tạo index trong MongoDB:
    # db.products.createIndex({ name: "text", description: "text" })
    search_query = {
        "$text": {
            "$search": query
        }
    }

    # Hoặc tìm kiếm đơn giản hơn với regex
    # search_query = {
    #     "$or": [
    #         {"name": {"$regex": query, "$options": "i"}},
    #         {"description": {"$regex": query, "$options": "i"}}
    #     ]
    # }

    cursor = product_collection.find(search_query).skip(skip).limit(limit)
    products = await cursor.to_list(length=limit)

    # Chuyển đổi ObjectId thành str
    for product in products:
        product["id"] = str(product.pop("_id"))

    return products


async def add_product_review(product_id: str, user_id: str, rating: float, comment: Optional[str] = None):
    """
    Thêm đánh giá cho sản phẩm
    """
    product_collection = get_product_collection()
    review_collection = get_review_collection()

    # Kiểm tra sản phẩm có tồn tại không
    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Kiểm tra người dùng đã đánh giá sản phẩm này chưa
    existing_review = await review_collection.find_one({
        "product_id": product_id,
        "user_id": user_id
    })

    if existing_review:
        # Cập nhật đánh giá hiện có
        await review_collection.update_one(
            {"_id": existing_review["_id"]},
            {"$set": {
                "rating": rating,
                "comment": comment,
                "updated_at": datetime.now(UTC)
            }}
        )

        review = await review_collection.find_one({"_id": existing_review["_id"]})
    else:
        # Tạo đánh giá mới
        review_data = {
            "product_id": product_id,
            "user_id": user_id,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now(UTC)
        }

        result = await review_collection.insert_one(review_data)
        review = await review_collection.find_one({"_id": result.inserted_id})

    # Chuyển đổi ObjectId thành str
    review["id"] = str(review.pop("_id"))

    return review


async def report_product(product_id: str, user_id: str, description: str, reported_link: Optional[str] = None):
    """
    Báo cáo sản phẩm vi phạm
    """
    product_collection = get_product_collection()
    report_collection = get_report_collection()

    # Kiểm tra sản phẩm có tồn tại không
    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Tạo báo cáo mới
    report_data = {
        "product_id": product_id,
        "user_id": user_id,
        "description": description,
        "reported_link": reported_link,
        "status": "pending",
        "created_at": datetime.now(UTC)
    }

    result = await report_collection.insert_one(report_data)
    report = await report_collection.find_one({"_id": result.inserted_id})

    # Chuyển đổi ObjectId thành str
    report["id"] = str(report.pop("_id"))

    return report