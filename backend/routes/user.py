from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from ..models.user import UserCreate, UserResponse, UserUpdate
from ..controllers.user_controller import (
    register_user,
    authenticate_user,
    get_user_profile,
    update_user_profile
)
from ..utils.auth import create_access_token, get_current_user

router = APIRouter(tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """
    Đăng ký tài khoản mới
    """
    return await register_user(user)


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Đăng nhập và nhận token JWT
    """
    user = await authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})

    return {"access_token": access_token, "token_type": "bearer"}


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
    return await get_user_profile(current_user["id"])


@router.put("/profile", response_model=UserResponse)
async def update_profile(user_update: UserUpdate, current_user=Depends(get_current_user)):
    """
    Cập nhật hồ sơ người dùng
    """
    return await update_user_profile(current_user["id"], user_update)