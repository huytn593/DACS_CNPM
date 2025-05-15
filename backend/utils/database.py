from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from typing import Dict, Any
import os
from pymongo.errors import ConnectionFailure, PyMongoError
from starlette import status

# Sử dụng biến môi trường cho connection string hoặc sử dụng connection string trực tiếp
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://admin:admin@ecommerce.hvapw5i.mongodb.net/ecommerce?retryWrites=true&w=majority")
DB_NAME = os.getenv("DB_NAME", "ecommerce")

# Tạo client kết nối
client = AsyncIOMotorClient(MONGODB_URL)
database = client[DB_NAME]

# Hàm kiểm tra kết nối
async def check_connection():
    try:
        await client.admin.command('ping')
        return True
    except ConnectionFailure:
        return False

# Các hàm getter cho các collection với chú thích kiểu dữ liệu
def get_user_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.users

def get_product_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.products

def get_order_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.orders

def get_review_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.reviews

def get_report_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.reports

def get_cart_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.carts

def get_wishlist_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.wishlists

def get_category_collection() -> AsyncIOMotorCollection[Dict[str, Any]]:
    return database.categories


# Thêm try/except blocks đầy đủ khi truy vấn MongoDB
async def get_user_profile(user_id: str):
    try:
        user_collection = get_user_collection()
        user = await user_collection.find_one({"_id": ObjectId(user_id)})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Convert ObjectId to string
        user["id"] = str(user.pop("_id"))

        # Không trả về password
        if "password" in user:
            user.pop("password")

        return user
    except (PyMongoError, ConnectionFailure) as e:
        # Log lỗi
        print(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error"
        )
    except Exception as e:
        # Log lỗi khác
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )