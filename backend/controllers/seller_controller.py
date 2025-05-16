from ..models.product import ProductCreate, ProductUpdate
from ..utils.database import get_product_collection, get_order_collection
from bson import ObjectId
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from datetime import datetime, UTC


async def create_product(product: ProductCreate, seller_id: str):
    product_collection = get_product_collection()
    product_dict = product.model_dump()
    product_dict["seller_id"] = seller_id
    product_dict["created_at"] = datetime.now(UTC)
    result = await product_collection.insert_one(product_dict)
    created_product = await product_collection.find_one({"_id": result.inserted_id})
    created_product["id"] = str(created_product.pop("_id"))
    return created_product


async def update_product(product_id: str, product_update: ProductUpdate, seller_id: str):
    product_collection = get_product_collection()
    existing_product = await product_collection.find_one({
        "_id": ObjectId(product_id),
        "seller_id": seller_id
    })
    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to update it"
        )
    update_data = {k: v for k, v in product_update.model_dump(exclude_unset=True).items() if v is not None}
    if update_data:
        await product_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )
    updated_product = await product_collection.find_one({"_id": ObjectId(product_id)})
    updated_product["id"] = str(updated_product.pop("_id"))
    return updated_product


async def delete_product(product_id: str, seller_id: str):
    product_collection = get_product_collection()
    existing_product = await product_collection.find_one({
        "_id": ObjectId(product_id),
        "seller_id": seller_id
    })
    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to delete it"
        )
    await product_collection.delete_one({"_id": ObjectId(product_id)})


async def get_seller_products(seller_id: str) -> List[Dict[str, Any]]:
    product_collection = get_product_collection()
    cursor = product_collection.find({"seller_id": seller_id})
    products = await cursor.to_list(length=100)
    for product in products:
        product["id"] = str(product.pop("_id"))
    return products


async def get_seller_orders(
    seller_id: str,
    order_status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Lấy các đơn hàng chứa sản phẩm của seller
    """
    product_collection = get_product_collection()
    order_collection = get_order_collection()

    # Lấy ID sản phẩm của seller
    cursor = product_collection.find(
        {"seller_id": seller_id},
        projection={"_id": 1}
    )
    seller_product_ids = [str(prod["_id"]) for prod in await cursor.to_list(length=100)]

    # Xây dựng query
    query: Dict[str, Any] = {"items.product_id": {"$in": seller_product_ids}}
    if order_status:
        query["status"] = order_status

    cursor = order_collection.find(query).sort("created_at", -1)
    orders = await cursor.to_list(length=100)

    for order in orders:
        order["id"] = str(order.pop("_id"))
        # Lọc item chỉ của seller
        seller_items = []
        for item in order.get("items", []):
            if item.get("product_id") in seller_product_ids:
                if "_id" in item:
                    item["id"] = str(item.pop("_id"))
                seller_items.append(item)
        order["items"] = seller_items

    return orders


async def update_order_status(
    order_id: str,
    new_status: str,
    seller_id: str
):
    """
    Cập nhật trạng thái đơn hàng (chỉ cho sản phẩm của seller)
    """
    order_collection = get_order_collection()
    product_collection = get_product_collection()

    try:
        order = await order_collection.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format"
        )

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    cursor = product_collection.find(
        {"seller_id": seller_id},
        projection={"_id": 1}
    )
    seller_product_ids = [str(prod["_id"]) for prod in await cursor.to_list(length=100)]

    has_seller_products = any(
        item.get("product_id") in seller_product_ids
        for item in order.get("items", [])
    )
    if not has_seller_products:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this order"
        )

    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    if order.get("status") in ["delivered", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update order with status: {order['status']}"
        )

    update_data: Dict[str, Any] = {
        "status": new_status,
        "updated_at": datetime.now(UTC)
    }
    if new_status == "processing":
        update_data["processing_date"] = datetime.now(UTC)
    elif new_status == "shipped":
        update_data["shipped_date"] = datetime.now(UTC)
    elif new_status == "delivered":
        update_data["delivered_date"] = datetime.now(UTC)
    elif new_status == "cancelled":
        update_data["cancelled_date"] = datetime.now(UTC)

    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )

    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    updated_order["id"] = str(updated_order.pop("_id"))
    for item in updated_order.get("items", []):
        if "_id" in item:
            item["id"] = str(item.pop("_id"))

    return updated_order