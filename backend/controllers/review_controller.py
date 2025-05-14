from datetime import datetime, UTC
from bson import ObjectId
from fastapi import HTTPException, status
from typing import List

from ..models.review import ReviewCreate, ReviewResponse
from ..utils.database import database


async def create_review(product_id: str, user_id: str, review: ReviewCreate) -> ReviewResponse:
    """
    Create a new review for a product
    """
    db = await database()

    # Kiểm tra sản phẩm có tồn tại không
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Kiểm tra người dùng đã từng mua sản phẩm này chưa
    order_exists = await db.orders.find_one({
        "user_id": ObjectId(user_id),
        "items.product_id": ObjectId(product_id),
        "status": "completed"  # Chỉ cho phép đánh giá sau khi hoàn tất đơn hàng
    })

    if not order_exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review products you have purchased"
        )

    # Kiểm tra người dùng đã đánh giá sản phẩm này chưa
    existing_review = await db.reviews.find_one({
        "user_id": ObjectId(user_id),
        "product_id": ObjectId(product_id)
    })

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )

    # Tạo review mới
    review_data = {
        "product_id": ObjectId(product_id),
        "user_id": ObjectId(user_id),
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now(UTC)
    }

    result = await db.reviews.insert_one(review_data)

    # Cập nhật sản phẩm với review mới
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$push": {"reviews": result.inserted_id}}
    )

    # Lấy review đã tạo
    created_review = await db.reviews.find_one({"_id": result.inserted_id})

    return ReviewResponse(
        id=str(created_review["_id"]),
        product_id=str(created_review["product_id"]),
        user_id=str(created_review["user_id"]),
        rating=created_review["rating"],
        comment=created_review.get("comment"),
        created_at=created_review["created_at"]
    )


async def get_product_reviews(product_id: str) -> List[ReviewResponse]:
    """
    Get all reviews for a product
    """
    db = await database()

    # Kiểm tra sản phẩm có tồn tại không
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Lấy tất cả đánh giá của sản phẩm
    reviews = []
    async for review in db.reviews.find({"product_id": ObjectId(product_id)}):
        reviews.append(
            ReviewResponse(
                id=str(review["_id"]),
                product_id=str(review["product_id"]),
                user_id=str(review["user_id"]),
                rating=review["rating"],
                comment=review.get("comment"),
                created_at=review["created_at"]
            )
        )

    return reviews