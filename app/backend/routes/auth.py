# app/backend/routes/auth.py
from fastapi import APIRouter, Depends, Body, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Dict

from jose import JWTError

from app.backend.models.user import UserCreate, UserResponse
from app.backend.controllers import user_controller, auth_controller
from app.backend.utils.auth import create_access_token, get_current_user
from app.config import settings

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate = Body(...)):
    return await user_controller.create_user(user)


@router.post("/auth/login", response_model=Dict[str, str])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await auth_controller.authenticate_user(form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    return current_user


@router.post("/auth/check-token", response_model=Dict[str, bool])
async def check_token_validity(token_data: Dict[str, str] = Body(...)):
    token = token_data.get("token")
    if not token:
        return {"valid": False}

    try:
        from ..utils.auth import jwt, settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            return {"valid": False}

        # Check if user exists
        user = await user_controller.get_user(user_id)
        return {"valid": user is not None}
    except (JWTError, ValueError, AttributeError):
        # Specify exceptions that could occur during token validation
        return {"valid": False}


@router.post("/auth/logout")
async def logout(_: Response):
    # Since JWT tokens are stateless, we can't invalidate them server-side
    # The client should remove the token from local storage
    return {"message": "Logged out successfully"}