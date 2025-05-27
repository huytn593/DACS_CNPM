from typing import Optional
from fastapi import APIRouter, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..models.user import UserCreate, UserResponse, UserUpdate
from datetime import datetime, UTC
from ..utils.auth import get_password_hash
from ..utils.database import get_db
import uuid

router = APIRouter(tags=["users"])


async def create_user(user: UserCreate) -> UserResponse:
    user_collection = get_db().users
    existing = await user_collection.find_one({"$or": [{"email": user.email}, {"username": user.username}]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    now = datetime.now(UTC)
    user_id = str(uuid.uuid4())
    new_user = {
        "_id": user_id,  # Đặt _id là string uuid
        "id": user_id,   # Đặt id là string uuid
        "email": user.email,
        "full_name": user.full_name,
        "username": user.username,
        "role": user.role,
        "phone": user.phone,
        "address": user.address,
        "hashed_password": get_password_hash(user.password),
        "created_at": now,
        "updated_at": now,
    }
    await user_collection.insert_one(new_user)
    new_user.pop("hashed_password")
    return UserResponse(**new_user)

async def get_user(user_id: str) -> Optional[UserResponse]:
    user_collection = get_db().users
    user = await user_collection.find_one({"id": user_id})
    if not user:
        return None
    user["id"] = str(user["id"])
    user.pop("hashed_password", None)
    return UserResponse(**user)

async def update_user(user_id: str, user_update: UserUpdate) -> Optional[UserResponse]:
    user_collection = get_db().users
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    update_data["updated_at"] = datetime.now(UTC)
    await user_collection.update_one({"id": user_id}, {"$set": update_data})
    user = await user_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user["id"])
    user.pop("hashed_password", None)
    return UserResponse(**user)