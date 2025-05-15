from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, UTC
from typing import Dict, Any, List, Optional, cast
from motor.motor_asyncio import AsyncIOMotorCollection

from ..utils.database import get_cart_collection, get_product_collection
from ..models.cart import CartResponse, CartItemResponse, CartItemUpdate
from ..models.product import ProductResponse


async def get_user_cart(user_id: str) -> CartResponse:
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Lấy cart, ép kiểu Dict[str,Any]
    cart: Dict[str, Any] = await cart_collection.find_one({"user_id": user_id}) or {}

    # Nếu chưa có cart thì khởi tạo mới
    if not cart.get("_id"):
        cart = {
            "user_id":    user_id,
            "items":      [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        result = await cart_collection.insert_one(cart)
        cart["_id"] = result.inserted_id

    cart_items: List[CartItemResponse] = []

    # Cast items thành List[Dict[str,Any]]
    for item in cast(List[Dict[str, Any]], cart.get("items", [])):
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue

        product_resp = ProductResponse(
            id=str(product["_id"]),
            name=product["name"],
            description=product.get("description", ""),
            price=float(product["price"]),
            size=product.get("size", []),
            color=product.get("color", []),
            stock=int(product.get("stock", 0)),
            category=product.get("category", ""),
            seller_id=product.get("seller_id", ""),
            created_at=product.get("created_at", datetime.now(UTC)),
            reviews=[]
        )

        cart_items.append(
            CartItemResponse(
                id=str(item.get("_id", "")),
                product_id=item["product_id"],
                quantity=int(item.get("quantity", 0)),
                size=item.get("size"),
                color=item.get("color"),
                product=product_resp
            )
        )

    return CartResponse(
        id=str(cart.get("_id", "")),
        user_id=user_id,
        items=cart_items
    )


async def add_to_cart_func(
    user_id: str,
    product_id: str,
    quantity: int,
    size: Optional[str] = None,
    color: Optional[str] = None
) -> Dict[str, Any]:
    """Thêm sản phẩm vào giỏ hàng"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    product = await product_collection.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.get("stock", 0) < quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not enough stock available")

    cart: Dict[str, Any] = await cart_collection.find_one({"user_id": user_id}) or {}
    if not cart.get("_id"):
        cart = {
            "user_id":    user_id,
            "items":      [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        result = await cart_collection.insert_one(cart)
        cart["_id"] = result.inserted_id

    items = cast(List[Dict[str, Any]], cart.get("items", []))
    found = False
    for item in items:
        if (item["product_id"] == product_id and
                item.get("size") == size and
                item.get("color") == color):
            item["quantity"] = int(item.get("quantity", 0)) + quantity
            found = True
            break

    if not found:
        items.append({
            "_id": ObjectId(),
            "product_id": product_id,
            "quantity": quantity,
            "size": size,
            "color": color
        })

    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(UTC)}}
    )

    return {"message": "Item added to cart successfully"}


async def update_cart_item_func(
    user_id: str,
    item_id: str,
    item_update: CartItemUpdate
) -> Dict[str, Any]:
    """Cập nhật số lượng sản phẩm trong giỏ hàng"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()

    cart = await cart_collection.find_one({"user_id": user_id}) or {}
    if not cart.get("_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    items = cast(List[Dict[str, Any]], cart.get("items", []))
    found = False
    for item in items:
        if str(item.get("_id", "")) == item_id:
            item["quantity"] = item_update.quantity
            found = True
            break

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in cart")

    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(UTC)}}
    )

    return {"message": "Item updated successfully"}


async def remove_cart_item_func(user_id: str, item_id: str) -> Dict[str, Any]:
    """Xóa sản phẩm khỏi giỏ hàng"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()

    cart = await cart_collection.find_one({"user_id": user_id}) or {}
    if not cart.get("_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    items = cast(List[Dict[str, Any]], cart.get("items", []))
    filtered = [item for item in items if str(item.get("_id", "")) != item_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in cart")

    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": filtered, "updated_at": datetime.now(UTC)}}
    )

    return {"message": "Item removed from cart successfully"}


async def clear_cart_func(user_id: str) -> Dict[str, Any]:
    """Xóa toàn bộ giỏ hàng"""
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()

    cart = await cart_collection.find_one({"user_id": user_id}) or {}
    if not cart.get("_id"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    await cart_collection.update_one(
        {"_id": cart["_id"]},
        {"$set": {"items": [], "updated_at": datetime.now(UTC)}}
    )

    return {"message": "Cart cleared successfully"}