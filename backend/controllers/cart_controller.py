from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime, UTC
from typing import Dict, Any, List, cast
from motor.motor_asyncio import AsyncIOMotorCollection

from ..utils.database import get_cart_collection, get_product_collection
from ..models.cart    import CartResponse, CartItemResponse
from ..models.product import ProductResponse

async def get_user_cart(user_id: str) -> CartResponse:
    cart_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_cart_collection()
    product_collection: AsyncIOMotorCollection[Dict[str, Any]] = get_product_collection()

    # Lấy cart, ép kiểu Dict[str,Any]
    cart: Dict[str, Any] = await cart_collection.find_one({"user_id": user_id}) or {}

    # Nếu chưa có cart thì khởi tạo mới
    if not cart:
        cart = {
            "user_id":    user_id,
            "items":      [],
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        await cart_collection.insert_one(cart)

    cart_items: List[CartItemResponse] = []

    # Cast items thành List[Dict[str,Any]]
    for item in cast(List[Dict[str, Any]], cart.get("items", [])):
        # Lấy chi tiết sản phẩm
        product = await product_collection.find_one({"_id": ObjectId(item["product_id"])})
        if not product:
            continue

        # Tạo ProductResponse đủ trường
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
            reviews=[  # nếu bạn lưu review ở đâu khác thì fetch vào đây
                # Ví dụ giả sử product["reviews"] = List[dict]
                # for r in product.get("reviews", []):
                #     ReviewResponse(...)
            ]
        )

        # Tạo CartItemResponse
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

    # Trả về CartResponse
    return CartResponse(
        id=str(cart.get("_id", "")),
        user_id=user_id,
        items=cart_items
    )
