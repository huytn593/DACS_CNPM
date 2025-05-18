# app/backend/routes/comparison.py
from fastapi import APIRouter, Path, Body, Query
from typing import List

from app.backend.models.comparison import ComparisonRequest
from app.backend.models.product import ProductResponse
from app.backend.controllers import comparison_controller

router = APIRouter(tags=["comparison"])

@router.post("/products/compare", response_model=List[ProductResponse])
async def compare_products(comparison_request: ComparisonRequest = Body(...)):
    return await comparison_controller.compare_products(comparison_request)

@router.get("/products/{product_id}/comparable", response_model=List[ProductResponse])
async def get_comparable_products(
    product_id: str = Path(...),
    limit: int = Query(4, ge=1, le=10)
):
    return await comparison_controller.get_comparable_products(product_id, limit)