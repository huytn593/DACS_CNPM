from ..models.product import ProductCreate, ProductUpdate, ProductResponse
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

    # Lấy sản phẩm đã thêm để trả về
    created_product = await product_collection.find_one({"_id": result.inserted_id})

    # Chuyển đổi ObjectId thành str
    created_product["id"] = str(created_product.pop("_id"))

    return created_product


async def update_product(product_id: str, product_update: ProductUpdate, seller_id: str):
    product_collection = get_product_collection()

    # Kiểm tra xem sản phẩm có tồn tại và thuộc về seller này không
    existing_product = await product_collection.find_one({
        "_id": ObjectId(product_id),
        "seller_id": seller_id
    })

    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to update it"
        )

    # Lọc ra các trường có giá trị để cập nhật
    update_data = {k: v for k, v in product_update.model_dump(exclude_unset=True).items() if v is not None}

    if update_data:
        await product_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": update_data}
        )

    # Lấy sản phẩm đã cập nhật để trả về
    updated_product = await product_collection.find_one({"_id": ObjectId(product_id)})
    updated_product["id"] = str(updated_product.pop("_id"))

    return updated_product


async def delete_product(product_id: str, seller_id: str):
    product_collection = get_product_collection()

    # Kiểm tra xem sản phẩm có tồn tại và thuộc về seller này không
    existing_product = await product_collection.find_one({
        "_id": ObjectId(product_id),
        "seller_id": seller_id
    })

    if not existing_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or you don't have permission to delete it"
        )

    # Xóa sản phẩm
    await product_collection.delete_one({"_id": ObjectId(product_id)})


async def get_seller_products(seller_id: str) -> List[Dict[str, Any]]:
    """
    Lấy danh sách sản phẩm của một seller
    """
    product_collection = get_product_collection()

    # Tìm tất cả sản phẩm của seller
    cursor = product_collection.find({"seller_id": seller_id})
    products = await cursor.to_list(length=100)

    # Chuyển đổi ObjectId thành str cho mỗi sản phẩm
    for product in products:
        product["id"] = str(product.pop("_id"))

    return products


async def get_seller_orders(seller_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Lấy các đơn hàng chứa sản phẩm của seller
    """
    product_collection = get_product_collection()
    order_collection = get_order_collection()

    # Lấy tất cả các ID sản phẩm của seller
    cursor = product_collection.find({"seller_id": seller_id}, {"_id": 1})
    seller_product_ids = [str(product["_id"]) for product in await cursor.to_list(length=100)]

    # Xây dựng truy vấn
    query = {"items.product_id": {"$in": seller_product_ids}}
    if status:
        query["status"] = status

    # Tìm đơn hàng chứa sản phẩm của seller
    cursor = order_collection.find(query).sort("created_at", -1)
    orders = await cursor.to_list(length=100)

    # Xử lý kết quả
    for order in orders:
        order["id"] = str(order.pop("_id"))

        # Lọc chỉ hiển thị các sản phẩm thuộc về seller
        seller_items = []
        for item in order.get("items", []):
            if item["product_id"] in seller_product_ids:
                item["id"] = str(item.pop("_id")) if "_id" in item else "unknown"
                seller_items.append(item)

        # Thay thế items với danh sách chỉ chứa sản phẩm của seller
        order["items"] = seller_items

    return orders


async def update_order_status(order_id: str, new_status: str, seller_id: str):
    """
    Cập nhật trạng thái đơn hàng (chỉ cho các sản phẩm thuộc về seller)
    """
    order_collection = get_order_collection()
    product_collection = get_product_collection()

    # Kiểm tra đơn hàng tồn tại
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

    # Lấy danh sách ID sản phẩm của seller
    cursor = product_collection.find({"seller_id": seller_id}, {"_id": 1})
    seller_product_ids = [str(product["_id"]) for product in await cursor.to_list(length=100)]

    # Kiểm tra nếu đơn hàng có chứa sản phẩm của seller này
    has_seller_products = False
    for item in order.get("items", []):
        if item["product_id"] in seller_product_ids:
            has_seller_products = True
            break

    if not has_seller_products:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this order"
        )

    # Kiểm tra trạng thái hợp lệ
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Kiểm tra nếu đơn hàng đã hoàn thành hoặc đã hủy
    if order.get("status") in ["delivered", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update order with status: {order['status']}"
        )

    # Cập nhật trạng thái đơn hàng
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(UTC)
    }

    # Cập nhật thêm các ngày tương ứng với trạng thái
    if new_status == "processing":
        update_data["processing_date"] = datetime.now(UTC)
    elif new_status == "shipped":
        update_data["shipped_date"] = datetime.now(UTC)
    elif new_status == "delivered":
        update_data["delivered_date"] = datetime.now(UTC)
    elif new_status == "cancelled":
        update_data["cancelled_date"] = datetime.now(UTC)

    # Thực hiện cập nhật
    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": update_data}
    )

    # Trả về đơn hàng đã cập nhật
    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    updated_order["id"] = str(updated_order.pop("_id"))

    # Xử lý các item trong đơn hàng
    for item in updated_order.get("items", []):
        if "_id" in item:
            item["id"] = str(item.pop("_id"))

    return updated_order
