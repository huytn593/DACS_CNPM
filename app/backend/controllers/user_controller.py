from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..models.user import UserCreate, UserResponse, UserUpdate, User
from ..controllers import auth_controller
from ..utils.auth import create_access_token, get_current_user
from ..utils.database import get_db
from datetime import datetime, UTC
import uuid
from typing import List, Optional

router = APIRouter(tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """
    Đăng ký tài khoản mới
    """
    try:
        return await auth_controller.register_user(user)
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        # Log any unexpected errors
        print(f"Unexpected error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Đăng nhập và nhận token JWT
    """
    user = await auth_controller.authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})

    # Create a user response object without sensitive data
    user_response = {
        "id": user["id"],
        "username": user.get("username", ""),
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user.get("phone", ""),
        "address": user.get("address", "")
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/logout")
async def logout(_=Depends(get_current_user)):
    """
    Đăng xuất (xóa token ở phía client)
    """
    return {"detail": "Successfully logged out"}


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user=Depends(get_current_user)):
    """
    Lấy thông tin hồ sơ người dùng hiện tại
    """
    return await get_user(current_user["id"])


@router.put("/profile", response_model=UserResponse)
async def update_profile(user_update: UserUpdate, current_user=Depends(get_current_user)):
    """
    Cập nhật hồ sơ người dùng
    """
    return await update_user(current_user["id"], user_update)


async def create_user(user_data: UserCreate) -> UserResponse:
    db = get_db()

    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Hash password
    hashed_password = auth_controller.get_password_hash(user_data.password)

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        phone=user_data.phone,
        address=user_data.address,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.users.insert_one(user.model_dump())

    return UserResponse(**user.model_dump())


async def get_user(user_id: str) -> Optional[UserResponse]:
    db = get_db()

    user = await db.users.find_one({"id": user_id})
    if not user:
        return None

    return UserResponse(**user)


async def update_user(user_id: str, user_update: UserUpdate) -> Optional[UserResponse]:
    db = get_db()

    # Get user
    user = await db.users.find_one({"id": user_id})
    if not user:
        return None

    # Prepare update data
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}

    # Hash password if provided
    if user_update.password:
        update_data["password"] = auth_controller.get_password_hash(user_update.password)

    update_data["updated_at"] = datetime.now(UTC)

    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )

    # Get updated user
    updated_user = await db.users.find_one({"id": user_id})

    return UserResponse(**updated_user)


async def delete_user(user_id: str) -> bool:
    db = get_db()

    # Delete user
    result = await db.users.delete_one({"id": user_id})

    return result.deleted_count > 0


async def get_users(
        role: Optional[str] = None,
        query: Optional[str] = None,
        page: int = 1,
        size: int = 20
) -> List[UserResponse]:
    db = get_db()

    # Build filter
    filters = {}
    if role:
        filters["role"] = role
    
    # Add search query filter
    if query:
        filters["$or"] = [
            {"email": {"$regex": query, "$options": "i"}},
            {"username": {"$regex": query, "$options": "i"}},
            {"full_name": {"$regex": query, "$options": "i"}}
        ]

    # Calculate skip value for pagination
    skip = (page - 1) * size

    # Get users
    cursor = db.users.find(filters).sort("created_at", -1).skip(skip).limit(size)
    users = await cursor.to_list(length=size)

    return [UserResponse(**user) for user in users]


async def get_current_user(current_user: dict) -> UserResponse:
    """Get current user's profile"""
    return await get_user(current_user["id"])


async def update_current_user(current_user: dict, user_update: UserUpdate) -> UserResponse:
    """Update current user's profile"""
    return await update_user(current_user["id"], user_update)