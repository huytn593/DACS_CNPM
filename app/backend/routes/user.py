
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.backend.models.user import UserCreate, UserResponse, UserUpdate
from app.backend.controllers import auth_controller, user_controller
from app.backend.utils.auth import create_access_token, get_current_user

router = APIRouter(tags=["users"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    try:
        return await user_controller.create_user(user)
    except HTTPException as e:
        raise e
    except Exception as e:
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
        "phone": user.get("phone", ""),
        "address": user.get("address", ""),
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
    return {"detail": "Successfully logged out"}

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user=Depends(get_current_user)):
    user = await user_controller.get_user(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=UserResponse)
async def update_profile(user_update: UserUpdate, current_user=Depends(get_current_user)):
    user = await user_controller.update_user(current_user["id"], user_update)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user