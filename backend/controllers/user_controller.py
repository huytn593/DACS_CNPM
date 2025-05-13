from ..models.user import UserCreate, UserUpdate
from ..utils.database import get_user_collection
from ..utils.auth import get_password_hash, verify_password
from fastapi import HTTPException, status
from bson import ObjectId
from datetime import datetime


async def register_user(user: UserCreate):
    """
    Đăng ký người dùng mới
    """
    user_collection = get_user_collection()

    # Kiểm tra email đã tồn tại chưa
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Tạo user mới
    user_dict = user.dict()

    # Mã hóa mật khẩu
    user_dict["password"] = get_password_hash(user_dict["password"])

    # Thêm thời gian tạo
    user_dict["created_at"] = datetime.utcnow()

    # Lưu vào database
    result = await user_collection.insert_one(user_dict)

    # Lấy user đã tạo
    created_user = await user_collection.find_one({"_id": result.inserted_id})

    # Chuyển đổi ObjectId thành str
    created_user["id"] = str(created_user.pop("_id"))

    # Xóa mật khẩu trước khi trả về
    created_user.pop("password")

    return created_user


async def authenticate_user(email: str, password: str):
    """
    Xác thực người dùng
    """
    user_collection = get_user_collection()

    user = await user_collection.find_one({"email": email})
    if not user:
        return False

    if not verify_password(password, user["password"]):
        return False

    # Chuyển đổi ObjectId thành str
    user["id"] = str(user["_id"])

    return user


async def get_user_profile(user_id: str):
    """
    Lấy thông tin hồ sơ người dùng
    """
    user_collection = get_user_collection()

    try:
        user = await user_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Chuyển đổi ObjectId thành str
    user["id"] = str(user.pop("_id"))

    # Xóa mật khẩu trước khi trả về
    user.pop("password")

    return user


async def update_user_profile(user_id: str, user_update: UserUpdate):
    """
    Cập nhật hồ sơ người dùng
    """
    user_collection = get_user_collection()

    # Lọc ra các trường cần cập nhật
    update_data = {k: v for k, v in user_update.dict(exclude_unset=True).items() if v is not None}

    # Mã hóa mật khẩu nếu có
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])

    try:
        # Cập nhật người dùng
        result = await user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Lấy thông tin người dùng đã cập nhật
        updated_user = await user_collection.find_one({"_id": ObjectId(user_id)})

        # Chuyển đổi ObjectId thành str
        updated_user["id"] = str(updated_user.pop("_id"))

        # Xóa mật khẩu trước khi trả về
        updated_user.pop("password")

        return updated_user

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )