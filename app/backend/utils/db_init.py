# app/backend/utils/db_init.py
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


async def create_indexes():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_database()

    # Create indexes for products
    await db.products.create_index("seller_id")
    await db.products.create_index("category_id")
    await db.products.create_index([("name", "text"), ("description", "text")])

    # Create indexes for orders
    await db.orders.create_index("user_id")
    await db.orders.create_index("items.product_id")

    # Create indexes for reviews
    await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
    await db.reviews.create_index("user_id")

    # Create indexes for reports
    await db.reports.create_index([("status", 1), ("created_at", -1)])
    await db.reports.create_index("user_id")

    # Create indexes for carts
    await db.carts.create_index("user_id", unique=True)

    # Create indexes for stock alerts
    await db.stock_alerts.create_index([("seller_id", 1), ("resolved", 1)])
    await db.stock_alerts.create_index("product_id")

    print("All indexes created successfully")

# Call this function on app startup