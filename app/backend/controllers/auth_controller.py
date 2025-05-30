import uuid
from fastapi import HTTPException, status
from datetime import datetime, UTC
from typing import Optional, Dict, Any

from ..models.user import UserCreate, UserResponse, UserUpdate
from ..utils.auth import get_password_hash, verify_password
from ..utils.database import get_db


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user by ID
    """
    db = get_db()
    user = await db.users.find_one({"id": user_id})
    return user


async def register_user(user: UserCreate) -> UserResponse:
    """
    Register a new user
    """
    db = get_db()

    # Check if email already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_username = await db.users.find_one({"username": user.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create user ID
    user_id = str(uuid.uuid4())

    # Hash password
    hashed_password = get_password_hash(user.password)

    # Create user
    new_user = {
        "id": user_id,
        "email": user.email,
        "username": user.username,  # Ensure username is always set
        "full_name": user.full_name,
        "hashed_password": hashed_password,
        "role": user.role or "user",
        "phone": user.phone,
        "address": user.address,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    await db.users.insert_one(new_user)

    # Remove password from response
    user_response = new_user.copy()
    del user_response["hashed_password"]

    return UserResponse(**user_response)


async def authenticate_user(identifier: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticate a user by email/username and password
    """
    db = get_db()

    print(f"Attempting to authenticate user with identifier: {identifier}")

    # Try finding user by email first
    user = await db.users.find_one({"email": identifier})
    if user:
        print(f"User found by email: {identifier}")

    # If not found by email, try username
    if not user:
        user = await db.users.find_one({"username": identifier})
        if user:
            print(f"User found by username: {identifier}")

    if not user:
        print(f"No user found with identifier: {identifier}")
        return None

    # Verify password
    is_valid = verify_password(password, user["hashed_password"])
    print(f"Password verification result: {is_valid}")

    if not is_valid:
        return None

    return user


async def update_profile(user_id: str, user_update: UserUpdate) -> UserResponse:
    """
    Update user profile
    """
    db = get_db()

    # Find user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prepare update data
    update_data = {}

    if user_update.email is not None:
        # Check if email is not already taken by another user
        existing_user = await db.users.find_one({"email": user_update.email})
        if existing_user and existing_user["id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        update_data["email"] = user_update.email

    if user_update.username is not None:
        # Check if username is not already taken by another user
        existing_user = await db.users.find_one({"username": user_update.username})
        if existing_user and existing_user["id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        update_data["username"] = user_update.username

    if user_update.full_name is not None:
        update_data["full_name"] = user_update.full_name

    if user_update.password is not None:
        # Hash new password
        update_data["hashed_password"] = get_password_hash(user_update.password)

    if user_update.phone is not None:
        update_data["phone"] = user_update.phone

    if user_update.address is not None:
        update_data["address"] = user_update.address

    # Only admin can change role
    if user_update.role is not None and user["role"] == "admin":
        update_data["role"] = user_update.role

    # Update timestamp
    update_data["updated_at"] = datetime.now(UTC)

    # Update user
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})

    # Get updated user
    updated_user = await db.users.find_one({"id": user_id})

    # Remove password from response
    user_response = updated_user.copy()
    del user_response["hashed_password"]

    return UserResponse(**user_response)