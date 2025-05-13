from fastapi import HTTPException, status
from ..models.order import OrderCreate
from ..utils.database import get_order_collection, get_cart_collection, get_product_collection
from bson import ObjectId
from datetime import datetime
import random
import string

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
    cart_collection = get_cart_collection()
    order_collection = get_order_collection()
    product_collection = get_product_collection()
    
    # Lấy giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart or not cart.get("items") or len(cart["items"]) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty"
        )
    
    # Chuẩn bị các mục đơn hàng và tính tổng tiền
    order_items = []
    total_amount = 0
    
    # Phí ship cố định
    shipping_fee = 30000
    
    # Thêm sản phẩm vào đơn hàng và cập nhật số lượng
    for item in cart["items"]:
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        
        if not product:
            # Bỏ qua sản phẩm không tồn tại
            continue
        
        # Kiểm tra số lượng sản phẩm có đủ không
        if product.get("stock", 0) < item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for product: {product['name']}"
            )
        
        # Giảm số lượng sản phẩm trong kho
        await product_collection.update_one(
            {"_id": product["_id"]},
            {"$inc": {"stock": -item["quantity"]}}
        )
        
        # Tính tiền cho mục đơn hàng này
        item_price = product["price"]
        item_total = item_price * item["quantity"]
        total_amount += item_total
        
        # Thêm thông tin sản phẩm đầy đủ vào mục đơn hàng
        order_item = {
            "_id": ObjectId(),
            "product_id": str(product["_id"]),
            "name": product["name"],
            "price": item_price,
            "quantity": item["quantity"],
            "total": item_total,
            "size": item.get("size"),
            "color": item.get("color"),
            "image": product.get("image")
        }
        
        order_items.append(order_item)
    
    # Nếu không có sản phẩm hợp lệ
    if not order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid items in your cart"
        )
    
    # Thêm phí ship vào tổng tiền
    total_amount += shipping_fee
    
    # Tạo đơn hàng mới
    order = {
        "user_id": user_id,
        "order_number": generate_order_number(),
        "items": order_items,
        "shipping_info": order_data.shipping_info.dict(),
        "payment_method": order_data.payment_method,
        "shipping_fee": shipping_fee,
        "status": "pending",
        "total_amount": total_amount,
        "created_at": datetime.utcnow()
    }
    
    # Lưu đơn hàng vào database
    result = await order_collection.insert_one(order)
    created_order = await order_collection.find_one({"_id": result.inserted_id})
    
    # Xóa giỏ hàng sau khi đặt hàng thành công
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": []}}
    )
    
    # Chuyển đổi _id thành id
    created_order["id"] = str(created_order.pop("_id"))
    
    # Chuyển đổi _id trong các mục đơn hàng thành id
    for item in created_order["items"]:
        item["id"] = str(item.pop("_id"))
        item["product_id"] = str(item["product_id"])
    
    return created_order

async def get_user_orders(user_id: str, status=None, from_date=None, to_date=None):
    """
    Lấy danh sách đơn hàng của người dùng
    """
    order_collection = get_order_collection()
    
    # Xây dựng filter query
    filter_query = {"user_id": user_id}
    
    if status:
        filter_query["status"] = status
    
    # Lọc theo ngày
    if from_date or to_date:
        date_filter = {}
        if from_date:
            date_filter["$gte"] = datetime.strptime(from_date, "%Y-%m-%d")
        if to_date:
            date_filter["$lte"] = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        
        if date_filter:
            filter_query["created_at"] = date_filter
    
    # Sắp xếp theo thời gian tạo (mới nhất trước)
    orders = await order_collection.find(filter_query).sort("created_at", -1).to_list(1000)
    
    # Chuyển đổi _id thành id
    for order in orders:
        order["id"] = str(order.pop("_id"))
        
        # Chuyển đổi _id trong các mục đơn hàng thành id
        for item in order["items"]:
            item["id"] = str(item.pop("_id"))
    
    return orders

async def get_order_by_id(order_id: str, user_id: str):
    """
    Lấy thông tin chi tiết đơn hàng
    """
    order_collection = get_order_collection()
    
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
    
    # Kiểm tra quyền truy cập (chỉ người dùng đặt hàng mới được xem)
    if order["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this order"
        )
    
    # Chuyển đổi _id thành id
    order["id"] = str(order.pop("_id"))
    
    # Chuyển đổi _id trong các mục đơn hàng thành id
    for item in order["items"]:
        item["id"] = str(item.pop("_id"))
    
    return order

async def update_order_status(order_id: str, new_status: str, user_id: str):
    """
    Cập nhật trạng thái đơn hàng
    """
    order_collection = get_order_collection()
    
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
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
    
    # Kiểm tra quyền truy cập (chỉ người dùng đặt hàng mới được cập nhật)
    if order["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this order"
        )
    
    # Không thể cập nhật đơn hàng đã bị hủy hoặc đã giao
    if order["status"] in ["delivered", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update order with status: {order['status']}"
        )
    
    # Cập nhật trạng thái đơn hàng
    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Lấy đơn hàng đã cập nhật
    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    
    # Chuyển đổi _id thành id
    updated_order["id"] = str(updated_order.pop("_id"))
    
    # Chuyển đổi _id trong các mục đơn hàng thành id
    for item in updated_order["items"]:
        item["id"] = str(item.pop("_id"))
    
    return updated_order

async def cancel_order(order_id: str, user_id: str):
    """
    Hủy đơn hàng và hoàn trả số lượng sản phẩm
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
    
    # Kiểm tra quyền truy cập (chỉ người dùng đặt hàng mới được hủy)
    if order["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this order"
        )
    
    # Chỉ có thể hủy đơn hàng ở trạng thái pending hoặc processing
    if order["status"] not in ["pending", "processing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status: {order['status']}"
        )
    
    # Hoàn trả số lượng sản phẩm trong kho
    for item in order["items"]:
        await product_collection.update_one(
            {"_id": ObjectId(item["product_id"])},
            {"$inc": {"stock": item["quantity"]}}
        )
    
    # Cập nhật trạng thái đơn hàng thành cancelled
    await order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "status": "cancelled",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Lấy đơn hàng đã cập nhật
    updated_order = await order_collection.find_one({"_id": ObjectId(order_id)})
    
    # Chuyển đổi _id thành id
    updated_order["id"] = str(updated_order.pop("_id"))
    
    # Chuyển đổi _id trong các mục đơn hàng thành id
    for item in updated_order["items"]:
        item["id"] = str(item.pop("_id"))
    
    return updated_order