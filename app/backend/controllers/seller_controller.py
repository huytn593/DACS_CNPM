# app/backend/controllers/seller_controller.py
import uuid
from fastapi import HTTPException, status
from datetime import datetime, timedelta, UTC
from typing import List, Optional, Dict, Any

from ..models.product import ProductCreate, ProductUpdate, ProductInDB as Product, ProductResponse
from ..utils.database import get_db


async def get_seller_products(seller_id: str) -> List[ProductResponse]:
    """Get all products for a specific seller."""
    db = get_db()

    # Get products
    cursor = db.products.find({"seller_id": seller_id})
    products = await cursor.to_list(length=100)

    # Get additional information for each product
    result = []
    for product in products:
        # Get seller name
        seller = await db.users.find_one({"id": product.get("seller_id")})
        seller_name = seller.get("full_name") if seller else None

        # Get category name
        category = await db.categories.find_one({"id": product.get("category_id")})
        category_name = category.get("name") if category else None

        # Add additional fields
        product["seller_name"] = seller_name
        product["category_name"] = category_name

        result.append(ProductResponse(**product))

    return result


async def get_product_by_seller(product_id: str, seller_id: str) -> Optional[ProductResponse]:
    """Get a specific product for a seller, ensuring it belongs to them."""
    db = get_db()

    # Get product
    product = await db.products.find_one({"id": product_id, "seller_id": seller_id})
    if not product:
        return None

    # Get seller name
    seller = await db.users.find_one({"id": seller_id})
    seller_name = seller.get("full_name") if seller else None

    # Get category name
    category = await db.categories.find_one({"id": product.get("category_id")})
    category_name = category.get("name") if category else None

    # Add additional fields
    product["seller_name"] = seller_name
    product["category_name"] = category_name

    return ProductResponse(**product)


async def create_seller_product(seller_id: str, product_data: ProductCreate) -> ProductResponse:
    """Create a new product for a seller."""
    db = get_db()

    # Check if category exists
    if product_data.category_id:
        category = await db.categories.find_one({"id": product_data.category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )

    # Create product ID
    product_id = str(uuid.uuid4())

    # Create product
    product = Product(
        id=product_id,
        seller_id=seller_id,
        **product_data.model_dump(),
        average_rating=0,
        review_count=0,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.products.insert_one(product.model_dump())

    # Get seller name
    seller = await db.users.find_one({"id": seller_id})
    seller_name = seller.get("full_name") if seller else None

    # Get category name
    category_name = None
    if product_data.category_id:
        category = await db.categories.find_one({"id": product_data.category_id})
        category_name = category.get("name") if category else None

    # Add additional fields to response
    product_dict = product.model_dump()
    product_dict["seller_name"] = seller_name
    product_dict["category_name"] = category_name

    return ProductResponse(**product_dict)


async def update_seller_product(
        seller_id: str,
        product_id: str,
        product_update: ProductUpdate
) -> Optional[ProductResponse]:
    """Update a product for a seller."""
    db = get_db()

    # Check if product exists and belongs to seller
    product = await db.products.find_one({"id": product_id, "seller_id": seller_id})
    if not product:
        return None

    # Check if category exists if updating category
    if product_update.category_id:
        category = await db.categories.find_one({"id": product_update.category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )

    # Prepare update data
    update_data = {k: v for k, v in product_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)

    # Update product
    await db.products.update_one({"id": product_id}, {"$set": update_data})

    # Get updated product
    updated_product = await db.products.find_one({"id": product_id})

    # Get seller name
    seller = await db.users.find_one({"id": seller_id})
    seller_name = seller.get("full_name") if seller else None

    # Get category name
    category_id = updated_product.get("category_id")
    category_name = None
    if category_id:
        category = await db.categories.find_one({"id": category_id})
        category_name = category.get("name") if category else None

    # Add additional fields to response
    updated_product["seller_name"] = seller_name
    updated_product["category_name"] = category_name

    return ProductResponse(**updated_product)


async def delete_seller_product(seller_id: str, product_id: str) -> bool:
    """Delete a product for a seller."""
    db = get_db()

    # Delete product if it belongs to seller
    result = await db.products.delete_one({"id": product_id, "seller_id": seller_id})

    return result.deleted_count > 0


async def get_seller_sales_stats(seller_id: str, time_period: str = "month") -> Dict[str, Any]:
    """Get sales statistics for a seller."""
    db = get_db()

    # Determine date range based on time period
    current_date = datetime.now(UTC)

    if time_period == "day":
        start_date = datetime(current_date.year, current_date.month, current_date.day)
    elif time_period == "week":
        # Get the start of the current week (Monday)
        start_date = current_date - timedelta(days=current_date.weekday())
        start_date = datetime(start_date.year, start_date.month, start_date.day)
    elif time_period == "month":
        start_date = datetime(current_date.year, current_date.month, 1)
    elif time_period == "year":
        start_date = datetime(current_date.year, 1, 1)
    else:
        # Default to month if invalid period
        start_date = datetime(current_date.year, current_date.month, 1)

    # Get all orders containing products from this seller
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$unwind": "$items"},
        {"$lookup": {
            "from": "products",
            "localField": "items.product_id",
            "foreignField": "id",
            "as": "product"
        }},
        {"$unwind": "$product"},
        {"$match": {"product.seller_id": seller_id}},
        {"$group": {
            "_id": "$items.product_id",
            "product_name": {"$first": "$items.product_name"},
            "quantity_sold": {"$sum": "$items.quantity"},
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"revenue": -1}}
    ]

    product_sales = await db.orders.aggregate(pipeline).to_list(length=100)

    # Calculate totals
    total_revenue = sum(item["revenue"] for item in product_sales)
    total_orders = sum(item["order_count"] for item in product_sales)
    total_items_sold = sum(item["quantity_sold"] for item in product_sales)

    return {
        "time_period": time_period,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": current_date.strftime("%Y-%m-%d"),
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_items_sold": total_items_sold,
        "product_sales": product_sales
    }