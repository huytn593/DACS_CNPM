# app/backend/utils/db_init.py
from motor.motor_asyncio import AsyncIOMotorClient

from app.backend.utils.database import get_db
from app.config import settings


async def create_indexes():
    """Create database indexes"""

    db = get_db()

    # User indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)

    # For username index, we need to check if there are users with null usernames first
    users_without_username = await db.users.count_documents({"username": None})

    if users_without_username > 0:
        print(f"Found {users_without_username} users without username. Updating them with generated usernames.")
        # Update users without username to have a generated username based on their email
        users = db.users.find({"username": None})

        async for user in users:
            # Generate a username from email (part before @)
            email_prefix = user.get("email", "user").split("@")[0]
            # Add a unique suffix based on user ID
            username = f"{email_prefix}_{user['id'][-6:]}"

            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"username": username}}
            )

    # User indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)

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