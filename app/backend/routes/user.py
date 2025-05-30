from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.backend.models.user import UserCreate, UserResponse, UserUpdate
from app.backend.controllers import auth_controller
from app.backend.utils.auth import create_access_token, get_current_user
from app.backend.controllers.stats_controller import (
    dashboard_daily_orders,
    dashboard_top_products
)

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

    # Create a user response without sensitive fields
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "username": user.get("username", ""),
        "full_name": user["full_name"],
        "role": user["role"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"]
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
    # Direct return of the current user, which already comes from the dependency
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(user_update: UserUpdate, current_user=Depends(get_current_user)):
    """
    Cập nhật hồ sơ người dùng
    """
    return await auth_controller.update_profile(current_user["id"], user_update)

@router.get("/dashboard/daily-orders")
async def api_dashboard_daily_orders(days: int = 30):
    return await dashboard_daily_orders(days)

@router.get("/dashboard/top-products")
async def api_dashboard_top_products(limit: int = 5):
    return await dashboard_top_products(limit)