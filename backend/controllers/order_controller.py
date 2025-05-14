from fastapi import HTTPException, status
from ..models.order import OrderCreate
from ..utils.database import get_order_collection, get_cart_collection, get_product_collection
from bson import ObjectId
from datetime import datetime, UTC
import random
import string
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorCollection


def generate_order_number():
    """
    Tạo mã đơn hàng ngẫu nhiên
    """
    timestamp = datetime.now().strftime("%Y%m%d")
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD-{timestamp}-{random_chars}"


async def create_order(user_id: str, order_data: OrderCreate):
    """
    Tạo đơn hàng mới từ giỏ hàng của người dùng
    """
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    order_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_order_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Lấy giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})

    if not cart or not cart.get("items"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty"
        )

    order_items: List[Dict[str, Any]] = []
    total_amount = 0
    shipping_fee = 30000

    # Xử lý từng item trong cart
    for item in cart.get("items", []):
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue

        if product.get("stock", 0) < item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for product: {product['name']}"
            )

        # Giảm stock
        await product_collection.update_one(
            {"_id": product["_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )

        item_price = product["price"]
        item_total = item_price * item["quantity"]
        total_amount += item_total

        order_items.append({
            "_id": ObjectId(),
            "product_id": str(product["_id"]),
            "name": product.get("name", ""),
            "price": item_price,
            "quantity": item["quantity"],
            "total": item_total,
            "size": item.get("size"),
            "color": item.get("color"),
            "image": product.get("image")
        })

    if not order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid items in your cart"
        )

    total_amount += shipping_fee

    new_order = {
        "user_id":        user_id,
        "order_number":   generate_order_number(),
        "items":          order_items,
        "shipping_info":  order_data.shipping_info.model_dump(),
        "payment_method": order_data.payment_method,
        "shipping_fee":   shipping_fee,
        "status":         "pending",
        "total_amount":   total_amount,
        "created_at":     datetime.now(UTC)
    }

    result = await order_collection.insert_one(new_order)
    created_order = await order_collection.find_one({"_id": result.inserted_id})

    # Xóa giỏ hàng
    await cart_collection.update_one(
        {"user_id": user_id},
        {"$set": {"items": []}}
    )

    # Format response
    created_order["id"] = str(created_order.pop("_id"))
    for oi in created_order.get("items", []):
        oi["id"] = str(oi.pop("_id"))

    return created_order


async def get_user_orders(user_id: str, order_status: str = None, from_date: str = None, to_date: str = None):
    """
    Lấy danh sách đơn hàng của người dùng
    """
    order_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_order_collection()

    filter_query: Dict[str, Any] = {"user_id": user_id}
    if order_status:
        filter_query["status"] = order_status

    if from_date or to_date:
        date_filter: Dict[str, Any] = {}
        if from_date:
            date_filter["$gte"] = datetime.strptime(from_date, "%Y-%m-%d")
        if to_date:
            date_filter["$lte"] = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        filter_query["created_at"] = date_filter

    orders = await order_collection.find(filter_query).sort("created_at", -1).to_list(1000)

    for o in orders:
        o["id"] = str(o.pop("_id"))
        for oi in o.get("items", []):
            oi["id"] = str(oi.pop("_id"))

    return orders


async def get_order_by_id(order_id: str, user_id: str):
    """
    Lấy thông tin chi tiết đơn hàng
    """
    order_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_order_collection()
    try:
        order = await order_collection.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this order")

    order["id"] = str(order.pop("_id"))
    for oi in order.get("items", []):
        oi["id"] = str(oi.pop("_id"))

    return order


async def update_order_status(order_id: str, new_status: str, user_id: str):
    """
    Cập nhật trạng thái đơn hàng
    """
    order_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_order_collection()
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]

    if new_status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    try:
        order = await order_collection.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to update this order")
    if order.get("status") in ["delivered", "cancelled"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot update order with status: {order['status']}")

    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": new_status, "updated_at": datetime.now(UTC)}}
    )

    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    updated_order["id"] = str(updated_order.pop("_id"))
    for oi in updated_order.get("items", []):
        oi["id"] = str(oi.pop("_id"))

    return updated_order


async def cancel_order(order_id: str, user_id: str):
    """
    Hủy đơn hàng và hoàn trả số lượng sản phẩm
    """
    order_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_order_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    try:
        order = await order_collection.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order ID format")

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.get("user_id") != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to cancel this order")
    if order.get("status") not in ["pending", "processing"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel order with status: {order['status']}")

    # Hoàn trả stock
    for oi in order.get("items", []):
        await product_collection.update_one(
            {"_id": ObjectId(oi["product_id"])},
            {"$inc": {"stock": oi["quantity"]}}
        )

    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(UTC)}}
    )

    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    updated_order["id"] = str(updated_order.pop("_id"))
    for oi in updated_order.get("items", []):
        oi["id"] = str(oi.pop("_id"))

    return updated_order
