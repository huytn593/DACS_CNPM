# app/backend/controllers/comparison_controller.py
from fastapi import HTTPException, status
from typing import List, Dict

from ..controllers import product_controller
from ..models.product import ProductResponse
from ..models.comparison import ComparisonRequest


async def compare_products(comparison_request: ComparisonRequest) -> List[ProductResponse]:
    """Compare multiple products side by side"""
    # Check if all products exist and retrieve them
    products = []

    for product_id in comparison_request.product_ids:
        product = await product_controller.get_product(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found"
            )
        products.append(product)

    # Check that products are in the same category for meaningful comparison
    categories = set(product.category_id for product in products)
    if len(categories) > 1:
        # Not raising an exception, but providing a warning
        for product in products:
            product.comparison_warning = "Products are from different categories, comparison may not be meaningful"

    return products


async def get_comparable_products(product_id: str, limit: int = 4) -> List[ProductResponse]:
    """Get products that can be compared with the given product"""
    # Get the product first
    product = await product_controller.get_product(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Get products in the same category
    from ..controllers.product_controller import ProductSearchParams

    search_params = ProductSearchParams(
        category_id=product.category_id,
        exclude_ids=[product_id],
        page=1,
        size=limit
    )

    result = await product_controller.search_products(search_params)

    return result.items