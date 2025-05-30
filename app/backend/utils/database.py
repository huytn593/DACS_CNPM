# app/backend/utils/database.py
import motor.motor_asyncio
from typing import Optional
from app.config import settings

# MongoDB client
client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None


def get_database():
    """Get MongoDB database instance"""
    return client[settings.MONGODB_URL.split("/")[-1].split("?")[0]]


def get_db():
    """Get MongoDB database instance"""
    return get_database()


async def connect_to_mongo():
    """Connect to MongoDB"""
    global client
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)

    # Test connection
    await client.admin.command('ping')
    print("Connected to MongoDB")


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        client = None
        print("Disconnected from MongoDB")