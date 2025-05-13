from ..models.product import ProductCreate, ProductUpdate
from ..utils.database import get_product_collection
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime


async def create_product(product: ProductCreate, seller_id: str):
    product_collection = get_product_collection()

    product_dict = product.dict()
    product_dict["seller_id"] = seller_id
    product_dict["created_at"] = datetime.utcnow()

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
    update_data = {k: v for k, v in product_update.dict(exclude_unset=True).items() if v is not None}

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

# Các hàm khác cho seller_controller...