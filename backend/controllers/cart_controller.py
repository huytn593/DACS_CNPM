from ..models.cart import CartItemCreate, CartItemUpdate
from ..utils.database import get_cart_collection, get_product_collection
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime

async def get_user_cart(user_id: str):
    """
    Lấy giỏ hàng của người dùng
    """
    cart_collection = get_cart_collection()
    product_collection = get_product_collection()
    
    # Tìm giỏ hàng của người dùng hoặc tạo mới nếu chưa có
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart:
        # Tạo giỏ hàng mới
        cart = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.utcnow()
        }
        
        result = await cart_collection.insert_one(cart)
        cart = await cart_collection.find_one({"_id": result.inserted_id})
    
    # Lấy thông tin chi tiết sản phẩm trong giỏ hàng
    for item in cart.get("items", []):
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        
        if product:
            # Chuyển đổi ObjectId thành str
            product["id"] = str(product.pop("_id"))
            
            # Gán thông tin sản phẩm vào item
            item["product"] = product
        else:
            # Nếu sản phẩm không tồn tại, set product là None
            item["product"] = None
    
    # Loại bỏ các item có product là None (sản phẩm đã bị xóa)
    cart["items"] = [item for item in cart.get("items", []) if item.get("product") is not None]
    
    # Chuyển đổi ObjectId thành str
    cart["id"] = str(cart.pop("_id"))
    
    # Chuyển đổi ObjectId trong items thành str
    for item in cart.get("items", []):
        item["id"] = str(item.pop("_id"))
    
    return cart

async def add_to_cart(user_id: str, item: CartItemCreate):
    """
    Thêm sản phẩm vào giỏ hàng
    """
    cart_collection = get_cart_collection()
    product_collection = get_product_collection()
    
    # Kiểm tra sản phẩm có tồn tại không
    try:
        product = await product_collection.find_one({"_id": ObjectId(item.product_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product ID format"
        )
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Kiểm tra số lượng sản phẩm có đủ không
    if product.get("stock", 0) < item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough stock available"
        )
    
    # Tìm giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart:
        # Tạo giỏ hàng mới
        cart = {
            "user_id": user_id,
            "items": [],
            "created_at": datetime.utcnow()
        }
        
        result = await cart_collection.insert_one(cart)
        cart = await cart_collection.find_one({"_id": result.inserted_id})
    
    # Kiểm tra sản phẩm đã có trong giỏ hàng chưa (với cùng size và color)
    existing_item = None
    for cart_item in cart.get("items", []):
        if (cart_item["product_id"] == item.product_id and 
            cart_item.get("size") == item.size and 
            cart_item.get("color") == item.color):
            existing_item = cart_item
            break
    
    if existing_item:
        # Cập nhật số lượng
        new_quantity = existing_item["quantity"] + item.quantity
        
        # Kiểm tra lại số lượng
        if product.get("stock", 0) < new_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough stock available"
            )
        
        await cart_collection.update_one(
            {"_id": cart["_id"], "items._id": existing_item["_id"]},
            {"$set": {"items.$.quantity": new_quantity}}
        )
    else:
        # Thêm sản phẩm mới vào giỏ hàng
        cart_item = {
            "_id": ObjectId(),
            "product_id": item.product_id,
            "quantity": item.quantity,
            "size": item.size,
            "color": item.color,
            "added_at": datetime.utcnow()
        }
        
        await cart_collection.update_one(
            {"_id": cart["_id"]},
            {"$push": {"items": cart_item}}
        )
    
    # Lấy giỏ hàng đã cập nhật
    return await get_user_cart(user_id)

async def update_cart_item(user_id: str, item_id: str, item_update: CartItemUpdate):
    """
    Cập nhật số lượng sản phẩm trong giỏ hàng
    """
    cart_collection = get_cart_collection()
    product_collection = get_product_collection()
    
    # Tìm giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )
    
    # Tìm sản phẩm trong giỏ hàng
    existing_item = None
    for cart_item in cart.get("items", []):
        if str(cart_item["_id"]) == item_id:
            existing_item = cart_item
            break
    
    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    # Kiểm tra số lượng sản phẩm có đủ không
    product = await product_collection.find_one({"_id": ObjectId(existing_item["product_id"])})
    
    if not product:
        # Nếu sản phẩm không còn tồn tại, xóa khỏi giỏ hàng
        await cart_collection.update_one(
            {"_id": cart["_id"]},
            {"$pull": {"items": {"_id": ObjectId(item_id)}}}
        )
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product no longer exists"
        )
    
    if product.get("stock", 0) < item_update.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough stock available"
        )
    
    # Cập nhật số lượng
    await cart_collection.update_one(
        {"_id": cart["_id"], "items._id": ObjectId(item_id)},
        {"$set": {"items.$.quantity": item_update.quantity}}
    )
    
    # Lấy giỏ hàng đã cập nhật
    return await get_user_cart(user_id)

async def remove_cart_item(user_id: str, item_id: str):
    """
    Xóa một sản phẩm khỏi giỏ hàng
    """
    cart_collection = get_cart_collection()
    
    # Tìm giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )
    
    # Xóa sản phẩm khỏi giỏ hàng
    result = await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$pull": {"items": {"_id": ObjectId(item_id)}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    # Lấy giỏ hàng đã cập nhật
    return await get_user_cart(user_id)

async def clear_cart(user_id: str):
    """
    Xóa toàn bộ giỏ hàng
    """
    cart_collection = get_cart_collection()
    
    # Tìm giỏ hàng của người dùng
    cart = await cart_collection.find_one({"user_id": user_id})
    
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart not found"
        )
    
    # Xóa tất cả sản phẩm trong giỏ hàng
    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": []}}
    )
    
    # Lấy giỏ hàng đã cập nhật
    return await get_user_cart(user_id)