# app/backend/controllers/product_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List, Optional
from ..controllers import stock_alert_controller

from ..models.product import ProductCreate, ProductUpdate, ProductInDB as Product, ProductResponse
from ..utils.database import get_db


# Define ProductSearchParams class here since it's missing from the models
class ProductSearchParams:
    def __init__(
        self,
        query: Optional[str] = None,
        category_id: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        active: Optional[bool] = True,
        in_stock: Optional[bool] = True,
        sort_by: Optional[str] = "newest",
        page: int = 1,
        size: int = 20
    ):
        self.query = query
        self.category_id = category_id
        self.min_price = min_price
        self.max_price = max_price
        self.active = active
        self.in_stock = in_stock
        self.sort_by = sort_by
        self.page = page
        self.size = size


async def create_product(product_id: str,product_data: ProductCreate, seller_id: str) -> ProductResponse:
    db = get_db()

    if product_data.stock is not None and product_data.stock <= 5:
        await stock_alert_controller.check_stock_level(product_id, product_data.stock)

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


async def get_product(product_id: str) -> Optional[ProductResponse]:
    db = get_db()

    # Get product
    product = await db.products.find_one({"id": product_id})
    if not product:
        return None

    # Get seller name
    seller_id = product.get("seller_id")
    seller_name = None
    if seller_id:
        seller = await db.users.find_one({"id": seller_id})
        seller_name = seller.get("full_name") if seller else None

    # Get category name
    category_id = product.get("category_id")
    category_name = None
    if category_id:
        category = await db.categories.find_one({"id": category_id})
        category_name = category.get("name") if category else None

    # Add additional fields to response
    product["seller_name"] = seller_name
    product["category_name"] = category_name

    return ProductResponse(**product)


async def update_product(update_data, product_id: str, product_update: ProductUpdate) -> Optional[ProductResponse]:
    db = get_db()

    if "stock" in update_data and update_data["stock"] is not None:
        await stock_alert_controller.check_stock_level(product_id, update_data["stock"])

    # Check if product exists
    product = await db.products.find_one({"id": product_id})
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
    seller_id = updated_product.get("seller_id")
    seller_name = None
    if seller_id:
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


async def delete_product(product_id: str) -> bool:
    db = get_db()

    # Delete product
    result = await db.products.delete_one({"id": product_id})

    return result.deleted_count > 0


async def search_products(search_params: ProductSearchParams) -> List[ProductResponse]:
    db = get_db()

    # Build filter
    filters = {}

    # Add category filter
    if search_params.category_id:
        filters["category_id"] = search_params.category_id

    # Add search query filter
    if search_params.query:
        filters["$or"] = [
            {"name": {"$regex": search_params.query, "$options": "i"}},
            {"description": {"$regex": search_params.query, "$options": "i"}}
        ]

    # Add price range filter
    if search_params.min_price is not None or search_params.max_price is not None:
        filters["price"] = {}
        if search_params.min_price is not None:
            filters["price"]["$gte"] = search_params.min_price
        if search_params.max_price is not None:
            filters["price"]["$lte"] = search_params.max_price

    # Add active filter
    if search_params.active is not None:
        filters["active"] = search_params.active

    # Add in_stock filter
    if search_params.in_stock is not None and search_params.in_stock:
        filters["stock"] = {"$gt": 0}

    # Calculate skip value for pagination
    skip = (search_params.page - 1) * search_params.size

    # Determine sort order
    sort_field = "created_at"
    sort_direction = -1  # Default to newest first

    if search_params.sort_by:
        if search_params.sort_by == "price_asc":
            sort_field = "price"
            sort_direction = 1
        elif search_params.sort_by == "price_desc":
            sort_field = "price"
            sort_direction = -1
        elif search_params.sort_by == "rating":
            sort_field = "average_rating"
            sort_direction = -1
        elif search_params.sort_by == "newest":
            sort_field = "created_at"
            sort_direction = -1

    # Get products
    cursor = db.products.find(filters).sort(sort_field, sort_direction).skip(skip).limit(search_params.size)
    products = await cursor.to_list(length=search_params.size)

    # Get additional information for each product
    result = []
    for product in products:
        # Get seller name
        seller_id = product.get("seller_id")
        seller_name = None
        if seller_id:
            seller = await db.users.find_one({"id": seller_id})
            seller_name = seller.get("full_name") if seller else None

        # Get category name
        category_id = product.get("category_id")
        category_name = None
        if category_id:
            category = await db.categories.find_one({"id": category_id})
            category_name = category.get("name") if category else None

        # Add additional fields
        product["seller_name"] = seller_name
        product["category_name"] = category_name

        result.append(ProductResponse(**product))

    return result


async def get_featured_products(limit: int = 10) -> List[ProductResponse]:
    db = get_db()

    # Get featured products (those with highest average rating and review count > 0)
    cursor = db.products.find({"active": True, "stock": {"$gt": 0}, "review_count": {"$gt": 0}}).sort("average_rating",
                                                                                                      -1).limit(limit)
    products = await cursor.to_list(length=limit)

    # If not enough products with reviews, get products by newest
    if len(products) < limit:
        remaining = limit - len(products)
        # Exclude products we already got
        product_ids = [p.get("id") for p in products]
        cursor = db.products.find({"active": True, "stock": {"$gt": 0}, "id": {"$nin": product_ids}}).sort("created_at",
                                                                                                           -1).limit(
            remaining)
        additional_products = await cursor.to_list(length=remaining)
        products.extend(additional_products)

    # Get additional information for each product
    result = []
    for product in products:
        # Get seller name
        seller_id = product.get("seller_id")
        seller_name = None
        if seller_id:
            seller = await db.users.find_one({"id": seller_id})
            seller_name = seller.get("full_name") if seller else None

        # Get category name
        category_id = product.get("category_id")
        category_name = None
        if category_id:
            category = await db.categories.find_one({"id": category_id})
            category_name = category.get("name") if category else None

        # Add additional fields
        product["seller_name"] = seller_name
        product["category_name"] = category_name

        result.append(ProductResponse(**product))

    return result


async def check_low_stock(product_id: str, threshold: int = 5) -> bool:
    """Check if a product has low stock and send notification if needed."""
    db = get_db()

    product = await get_product(product_id)
    if not product:
        return False

    if product.stock <= threshold:
        # Check if notification already sent (to avoid spamming)
        notification_sent = await db.stock_alerts.find_one({
            "product_id": product_id,
            "resolved": False
        })

        if not notification_sent:
            # Create notification
            alert = {
                "id": str(uuid.uuid4()),
                "product_id": product_id,
                "product_name": product.name,
                "seller_id": product.seller_id,
                "current_stock": product.stock,
                "threshold": threshold,
                "created_at": datetime.now(UTC),
                "resolved": False
            }

            await db.stock_alerts.insert_one(alert)

            # In a real system, you'd send an email/notification to the seller here

        return True

    # If stock was low but now replenished, resolve alerts
    if product.stock > threshold:
        await db.stock_alerts.update_many(
            {"product_id": product_id, "resolved": False},
            {"$set": {"resolved": True}}
        )

    return False


# Call this whenever stock is updated or checked
async def get_seller_stock_alerts(seller_id: str) -> List[dict]:
    db = get_db()

    cursor = db.stock_alerts.find({
        "seller_id": seller_id,
        "resolved": False
    }).sort("created_at", -1)

    alerts = await cursor.to_list(length=100)
    return alerts
