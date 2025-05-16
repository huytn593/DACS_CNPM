from fastapi import APIRouter, Depends, Path, Body, status
from typing import List

from ..models.review import ReviewCreate, ReviewResponse
from ..utils.auth import get_current_user
from ..controllers.review_controller import create_review, get_product_reviews

router = APIRouter(tags=["reviews"])


@router.post("/products/{product_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def review_product(
        product_id: str = Path(...),
        review: ReviewCreate = Body(...),
        current_user: dict = Depends(get_current_user)
):
    """
    Add a review to a product
    """
    return await create_review(
        product_id=product_id,
        user_id=current_user["id"],
        review=review)

@router.get("/products/{product_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(product_id: str = Path(...)):
    """
    Get all reviews for a product
    """
    return await get_product_reviews(product_id)