# app/backend/routes/review.py
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status, Query
from typing import List

from app.backend.models.review import ReviewCreate, ReviewUpdate, ReviewResponse
from app.backend.controllers import review_controller
from app.backend.utils.auth import get_current_user

router = APIRouter(tags=["reviews"])


@router.post("/products/{product_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
        product_id: str = Path(...),
        review_data: ReviewCreate = Body(...),
        current_user=Depends(get_current_user)
):
    # Override product_id from path
    review_data.product_id = product_id

    return await review_controller.create_review(
        current_user["id"],
        current_user["full_name"],
        review_data
    )


@router.get("/products/{product_id}/reviews", response_model=dict)
async def get_product_reviews(
        product_id: str = Path(...),
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1, le=50)
):
    return await review_controller.get_product_reviews(product_id, page, size)


@router.get("/reviews/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: str = Path(...)):
    review = await review_controller.get_review(review_id)

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )

    return review


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
        review_id: str = Path(...),
        review_update: ReviewUpdate = Body(...),
        current_user=Depends(get_current_user)
):
    updated_review = await review_controller.update_review(
        review_id,
        current_user["id"],
        review_update
    )

    if not updated_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or you don't have permission to update it"
        )

    return updated_review


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
        review_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    # Admin can delete any review, user can only delete their own
    if current_user["role"] == "admin":
        deleted = await review_controller.delete_review(review_id, None)
    else:
        deleted = await review_controller.delete_review(review_id, current_user["id"])

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found or you don't have permission to delete it"
        )


@router.get("/user/reviews", response_model=List[ReviewResponse])
async def get_user_reviews(current_user=Depends(get_current_user)):
    return await review_controller.get_user_reviews(current_user["id"])