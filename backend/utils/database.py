import motor.motor_asyncio
import os
from pymongo.errors import ConnectionFailure

# Sử dụng biến môi trường cho connection string
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ecommerce_db")

# Tạo client kết nối
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
database = client[DB_NAME]

# Hàm kiểm tra kết nối
async def check_connection():
    try:
        await client.admin.command('ping')
        return True
    except ConnectionFailure:
        return False

# Các hàm getter cho các collection
def get_user_collection():
    return database.users

def get_product_collection():
    return database.products

def get_order_collection():
    return database.orders

def get_review_collection():
    return database.reviews

def get_report_collection():
    return database.reports

def get_cart_collection():
    return database.carts