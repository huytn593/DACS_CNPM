from fastapi import HTTPException, status
from ..utils.database import get_review_collection
from bson import ObjectId
from datetime import datetime, UTC
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from ..utils.database import get_report_collection, get_product_collection, get_user_collection
from ..models.report import ProductReportCreate, ProductReportResponse


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


async def report_product(user_id: str, product_id: str, report_data: ProductReportCreate) -> ProductReportResponse:
    """Create a new product report"""
    report_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_report_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()
    user_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_user_collection()

    # Verify product exists
    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Get user data
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create report
    report = {
        "product_id": ObjectId(product_id),
        "user_id": ObjectId(user_id),
        "reason": report_data.reason,
        "description": report_data.description,
        "status": "pending",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    # Insert report into database
    result = await report_collection.insert_one(report)

    # Get created report
    created_report = await report_collection.find_one({"_id": result.inserted_id})

    # Convert to ProductReportResponse
    return ProductReportResponse(
        id=str(created_report["_id"]),
        product_id=str(created_report["product_id"]),
        user_id=str(created_report["user_id"]),
        reason=created_report["reason"],
        description=created_report["description"],
        status=created_report["status"],
        created_at=created_report["created_at"],
        updated_at=created_report["updated_at"],
        user_name=user.get("name", ""),
        product_name=product.get("name", "")
    )


async def get_product_reports(
        user_role: str,
        page: int = 1,
        limit: int = 10,
        status_filter: Optional[str] = None,
        product_id: Optional[str] = None
) -> tuple[list[ProductReportResponse], int]:
    """Get product reports (admin only)"""
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    report_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_report_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()
    user_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_user_collection()

    # Build filter criteria
    filter_criteria: Dict[str, Any] = {}

    if status_filter:
        filter_criteria["status"] = status_filter

    if product_id:
        filter_criteria["product_id"] = ObjectId(product_id)

    # Count total matching reports
    total = await report_collection.count_documents(filter_criteria)

    # Get paginated reports
    skip = (page - 1) * limit
    cursor = report_collection.find(filter_criteria).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)

    # Format reports with product and user info
    formatted_reports = []
    for report in reports:
        # Get product and user info
        product = await product_collection.find_one({"_id": report["product_id"]})
        user = await user_collection.find_one({"_id": report["user_id"]})

        formatted_report = ProductReportResponse(
            id=str(report["_id"]),
            product_id=str(report["product_id"]),
            user_id=str(report["user_id"]),
            reason=report["reason"],
            description=report["description"],
            status=report["status"],
            created_at=report["created_at"],
            updated_at=report["updated_at"],
            user_name=user.get("name", "") if user else "Unknown user",
            product_name=product.get("name", "") if product else "Unknown product"
        )
        formatted_reports.append(formatted_report)

    return formatted_reports, total


async def update_report_status(report_id: str, new_status: str, user_role: str) -> ProductReportResponse:
    """Update report status (admin only)"""
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update reports"
        )

    report_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_report_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()
    user_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_user_collection()

    # Validate status
    valid_statuses = ["pending", "resolved", "rejected"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Update report
    update_result = await report_collection.update_one(
        {"_id": ObjectId(report_id)},
        {"$set": {"status": status, "updated_at": datetime.now(UTC)}}
    )

    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or status unchanged"
        )

    # Get updated report
    report = await report_collection.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Get product and user info
    product = await product_collection.find_one({"_id": report["product_id"]})
    user = await user_collection.find_one({"_id": report["user_id"]})

    return ProductReportResponse(
        id=str(report["_id"]),
        product_id=str(report["product_id"]),
        user_id=str(report["user_id"]),
        reason=report["reason"],
        description=report["description"],
        status=report["status"],
        created_at=report["created_at"],
        updated_at=report["updated_at"],
        user_name=user.get("name", "") if user else "Unknown user",
        product_name=product.get("name", "") if product else "Unknown product"
    )

