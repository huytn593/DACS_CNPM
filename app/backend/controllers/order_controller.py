# app/backend/controllers/order_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List, Optional

from ..models.order import OrderCreate, OrderUpdate, Order, OrderResponse, OrderStatus, OrderItem
from ..routes.cart import clear_cart
from ..controllers import product_controller, cart_controller
from ..utils.database import get_db


async def create_order(user_id: str, order_data: OrderCreate) -> OrderResponse:
    db = get_db()

    # Check if user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if items exist and build order items
    order_items = []
    total_amount = 0

    for item_data in order_data.items:
        product = await product_controller.get_product(item_data.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found"
            )

        # Check if quantity is available
        if product.stock < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for product {product.name}"
            )

        # Calculate item price
        item_total = product.price * item_data.quantity
        total_amount += item_total

        # Create order item
        order_item = OrderItem(
            id=str(uuid.uuid4()),
            product_id=product.id,
            product_name=product.name,
            product_image=product.images[0] if product.images else None,
            quantity=item_data.quantity,
            price=product.price,
            attributes=item_data.attributes
        )

        order_items.append(order_item)

        # Update product stock
        await db.products.update_one(
            {"id": product.id},
            {"$inc": {"stock": -item_data.quantity}}
        )

    # Add shipping fee
    shipping_fee = 30000  # Fixed shipping fee
    total_amount += shipping_fee

    # Create order
    order = Order(
        id=str(uuid.uuid4()),
        user_id=user_id,
        shipping_address=order_data.shipping_address,
        phone_number=order_data.phone_number,
        items=order_items,
        status=OrderStatus.pending,
        total_amount=total_amount,
        payment_method=order_data.payment_method or "COD",
        shipping_fee=shipping_fee,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.orders.insert_one(order.model_dump())

    return OrderResponse(**order.model_dump())

    await cart_controller.clear_cart(user_id)

    return OrderResponse(**order.model_dump())


async def get_order(order_id: str, user_id: str = None):
    db = get_db()

    # Find order and add user_name field
    pipeline = [
        {"$match": {"_id": order_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "_id",
            "as": "user"
        }},
        {"$addFields": {
            "user_name": {"$arrayElemAt": ["$user.name", 0]}
        }},
        {"$project": {"user": 0}}  # Remove user array
    ]

    order = await db.orders.aggregate(pipeline).to_list(1)
    if not order:
        return None

    return order[0]


async def update_order(order_id: str, order_update: OrderUpdate, user_id: Optional[str] = None) -> Optional[
    OrderResponse]:
    db = get_db()

    # Build query
    query = {"id": order_id}
    if user_id:
        query["user_id"] = user_id

    # Get order
    order = await db.orders.find_one(query)
    if not order:
        return None

    # Prepare update data
    update_data = {k: v for k, v in order_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)

    # Special handling for status change
    if order_update.status and order_update.status != order["status"]:
        old_status = OrderStatus(order["status"])

        # If canceling order, restore product stock
        if order_update.status == OrderStatus.canceled and old_status != OrderStatus.canceled:
            for item in order["items"]:
                await db.products.update_one(
                    {"id": item["product_id"]},
                    {"$inc": {"stock": item["quantity"]}}
                )

        # If un-canceling order, reduce product stock again
        elif old_status == OrderStatus.canceled and order_update.status != OrderStatus.canceled:
            for item in order["items"]:
                product = await product_controller.get_product(item["product_id"])

                # Check if quantity is available
                if product.stock < item["quantity"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Not enough stock for product {product.name}"
                    )

                await db.products.update_one(
                    {"id": item["product_id"]},
                    {"$inc": {"stock": -item["quantity"]}}
                )

    # Update order
    await db.orders.update_one(
        query,
        {"$set": update_data}
    )

    # Get updated order
    updated_order = await db.orders.find_one({"id": order_id})

    return OrderResponse(**updated_order)


async def delete_order(order_id: str, user_id: Optional[str] = None) -> bool:
    db = get_db()

    # Build query
    query = {"id": order_id}
    if user_id:
        query["user_id"] = user_id

    # Get order first to handle stock
    order = await db.orders.find_one(query)
    if not order:
        return False

    # Only pending orders can be deleted
    if order["status"] != OrderStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending orders can be deleted"
        )

    # Restore product stock
    for item in order["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": item["quantity"]}}
        )

    # Delete order
    await db.orders.delete_one(query)

    return True


async def get_seller_orders(seller_id: str) -> List[OrderResponse]:
    db = get_db()

    # Get seller's products
    cursor = db.products.find({"seller_id": seller_id})
    products = await cursor.to_list(length=100)
    product_ids = [product["id"] for product in products]

    if not product_ids:
        return []

    # Get orders containing seller's products
    # MongoDB query equivalent to finding orders with items.product_id in product_ids
    pipeline = [
        {
            "$match": {
                "items.product_id": {"$in": product_ids}
            }
        },
        {
            "$sort": {"created_at": -1}
        }
    ]

    cursor = db.orders.aggregate(pipeline)
    orders = await cursor.to_list(length=100)

    # Filter order items to only include seller's products
    for order in orders:
        order["items"] = [item for item in order["items"] if item["product_id"] in product_ids]

        # Recalculate total for seller's items only
        seller_total = sum(item["price"] * item["quantity"] for item in order["items"])
        order["seller_total"] = seller_total

    return [OrderResponse(**order) for order in orders]