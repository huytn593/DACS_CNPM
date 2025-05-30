# app/backend/controllers/review_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List, Optional

from ..models.review import ReviewCreate, ReviewUpdate, Review, ReviewResponse
from ..utils.database import get_db


async def create_review(user_id: str, user_name: str, review_data: ReviewCreate) -> ReviewResponse:
    db = get_db()

    # Check if product exists
    product = await db.products.find_one({"id": review_data.product_id})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if user has purchased this product
    has_purchased = await db.orders.find_one({
        "user_id": user_id,
        "items.product_id": review_data.product_id,
        "status": {"$in": ["delivered", "completed"]}  # Allow reviews for delivered or completed orders
    })

    if not has_purchased:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review products you have purchased"
        )

    # Check if user has already reviewed this product
    existing_review = await db.reviews.find_one({
        "user_id": user_id,
        "product_id": review_data.product_id
    })

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )

    # Create review
    review = Review(
        id=str(uuid.uuid4()),
        user_id=user_id,
        user_name=user_name,
        **review_data.model_dump(),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.reviews.insert_one(review.model_dump())

    # Update product average rating
    await update_product_rating(review_data.product_id)

    return ReviewResponse(**review.model_dump())


async def update_product_rating(product_id: str) -> float:
    """Update product's average rating and review count"""
    db = get_db()

    # Get all reviews for the product
    cursor = db.reviews.find({"product_id": product_id})
    reviews = await cursor.to_list(length=None)

    if not reviews:
        # If no reviews, set rating to 0
        avg_rating = 0
    else:
        # Calculate average rating
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        # Round to 1 decimal place
        avg_rating = round(avg_rating * 10) / 10

    # Update product
    await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "avg_rating": avg_rating,
            "review_count": len(reviews)
        }}
    )

    return avg_rating


async def get_product_reviews(product_id: str, page: int = 1, size: int = 10) -> dict:
    db = get_db()

    # Check if product exists
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Calculate skip value for pagination
    skip = (page - 1) * size

    # Get total count
    total_count = await db.reviews.count_documents({"product_id": product_id})

    # Get reviews
    cursor = db.reviews.find({"product_id": product_id}) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(size)

    reviews = await cursor.to_list(length=None)

    # Calculate total pages
    total_pages = (total_count + size - 1) // size

    return {
        "items": [ReviewResponse(**review) for review in reviews],
        "total": total_count,
        "page": page,
        "size": size,
        "pages": total_pages
    }


async def get_review(review_id: str) -> Optional[ReviewResponse]:
    db = get_db()

    review = await db.reviews.find_one({"id": review_id})
    if not review:
        return None

    return ReviewResponse(**review)


async def update_review(review_id: str, user_id: str, review_update: ReviewUpdate) -> Optional[ReviewResponse]:
    db = get_db()

    # Get the review
    review = await db.reviews.find_one({"id": review_id, "user_id": user_id})
    if not review:
        return None

    # Prepare update data
    update_data = {k: v for k, v in review_update.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(UTC)

        # Update review
        await db.reviews.update_one(
            {"id": review_id, "user_id": user_id},
            {"$set": update_data}
        )

        # Update product average rating if rating was changed
        if "rating" in update_data:
            await update_product_rating(review["product_id"])

    # Get updated review
    updated_review = await db.reviews.find_one({"id": review_id})

    return ReviewResponse(**updated_review)


async def delete_review(review_id: str, user_id: Optional[str] = None) -> bool:
    db = get_db()

    # Build query
    query = {"id": review_id}
    if user_id:  # If user_id is provided, verify ownership
        query["user_id"] = user_id

    # Get the review to get the product_id
    review = await db.reviews.find_one(query)
    if not review:
        return False

    product_id = review["product_id"]

    # Delete review
    result = await db.reviews.delete_one(query)

    if result.deleted_count:
        # Update product average rating
        await update_product_rating(product_id)
        return True

    return False


async def get_user_reviews(user_id: str) -> List[ReviewResponse]:
    db = get_db()

    cursor = db.reviews.find({"user_id": user_id}).sort("created_at", -1)
    reviews = await cursor.to_list(length=None)

    return [ReviewResponse(**review) for review in reviews]