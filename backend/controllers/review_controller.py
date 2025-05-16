from datetime import datetime, UTC
from bson import ObjectId
from fastapi import HTTPException, status
from ..models.review import ReviewCreate, ReviewResponse
from ..utils.database import database, get_review_collection, get_product_collection, get_order_collection, get_user_collection
from typing import List, Tuple

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
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)  # Add updated_at field
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
        comment=created_review.get("comment", ""),
        created_at=created_review["created_at"],
        updated_at=created_review.get("updated_at", created_review["created_at"])  # Provide default if missing
    )


async def get_reviews_for_product(product_id: str) -> List[ReviewResponse]:
    """
    Get all reviews for a product (simple version)
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
                comment=review.get("comment", ""),
                created_at=review["created_at"],
                updated_at=review.get("updated_at", review["created_at"])  # Provide default if missing
            )
        )

    return reviews


async def add_product_review(user_id: str, product_id: str, review_data: ReviewCreate) -> ReviewResponse:
    """Add a review for a product"""
    review_collection = get_review_collection()
    product_collection = get_product_collection()
    order_collection = get_order_collection()
    user_collection = get_user_collection()

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

    # Check if user has purchased the product (optional verification)
    has_purchased = await order_collection.find_one({
        "user_id": ObjectId(user_id),
        "status": "delivered",
        "items.product_id": ObjectId(product_id)
    })

    # Some sites only allow reviews for purchased products
    if not has_purchased:
        # Uncomment if you want to enforce this rule
        # raise HTTPException(
        #     status_code=status.HTTP_403_FORBIDDEN,
        #     detail="You can only review products you have purchased"
        # )
        pass

    # Check if user has already reviewed this product
    existing_review = await review_collection.find_one({
        "product_id": ObjectId(product_id),
        "user_id": ObjectId(user_id)
    })

    if existing_review:
        # Update existing review
        await review_collection.update_one(
            {"_id": existing_review["_id"]},
            {"$set": {
                "rating": review_data.rating,
                "comment": review_data.comment,
                "updated_at": datetime.now(UTC)
            }}
        )
        result_id = existing_review["_id"]
    else:
        # Create new review
        review = {
            "product_id": ObjectId(product_id),
            "user_id": ObjectId(user_id),
            "rating": review_data.rating,
            "comment": review_data.comment,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        result = await review_collection.insert_one(review)
        result_id = result.inserted_id

    # Update product average rating
    all_reviews = await review_collection.find({"product_id": ObjectId(product_id)}).to_list(length=None)
    avg_rating = sum(review["rating"] for review in all_reviews) / len(all_reviews) if all_reviews else 0

    await product_collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"rating": avg_rating, "review_count": len(all_reviews)}}
    )

    # Get created review
    created_review = await review_collection.find_one({"_id": result_id})

    # Convert to ReviewResponse
    return ReviewResponse(
        id=str(created_review["_id"]),
        product_id=str(created_review["product_id"]),
        user_id=str(created_review["user_id"]),
        rating=created_review["rating"],
        comment=created_review["comment"],
        created_at=created_review["created_at"],
        updated_at=created_review["updated_at"],
        user_name=user.get("name", "")
    )


async def get_product_reviews(
        product_id: str,
        page: int = 1,
        limit: int = 10,
        sort_by: str = "created_at",
        sort_order: int = -1
) -> Tuple[List[ReviewResponse], int]:
    """Get reviews for a product with pagination"""
    review_collection = get_review_collection()
    user_collection = get_user_collection()

    # Build filter criteria
    filter_criteria = {"product_id": ObjectId(product_id)}

    # Count total matching reviews
    total = await review_collection.count_documents(filter_criteria)

    # Get paginated reviews
    skip = (page - 1) * limit
    cursor = review_collection.find(filter_criteria).sort(sort_by, sort_order).skip(skip).limit(limit)
    reviews = await cursor.to_list(length=limit)

    # Format reviews with user info
    formatted_reviews = []
    for review in reviews:
        # Get user info
        user = await user_collection.find_one({"_id": review["user_id"]})

        formatted_review = ReviewResponse(
            id=str(review["_id"]),
            product_id=str(review["product_id"]),
            user_id=str(review["user_id"]),
            rating=review["rating"],
            comment=review.get("comment", ""),
            created_at=review["created_at"],
            updated_at=review.get("updated_at", review["created_at"]),  # Provide default if missing
            user_name=user.get("name", "") if user else "Anonymous"
        )
        formatted_reviews.append(formatted_review)

    return formatted_reviews, total
