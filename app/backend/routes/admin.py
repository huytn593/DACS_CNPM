# app/backend/routes/admin.py
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status, Query
from typing import List, Dict, Any

from app.backend.controllers import admin_controller, user_controller
from app.backend.utils.auth import admin_required
from app.backend.models.user import UserResponse, UserUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=Dict[str, Any])
async def get_admin_stats(_=Depends(admin_required)):
    return await admin_controller.get_site_stats()


@router.get("/stats/users", response_model=Dict[str, Any])
async def get_user_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "User statistics endpoint not implemented yet"}


@router.get("/stats/orders", response_model=Dict[str, Any])
async def get_order_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "Order statistics endpoint not implemented yet"}


@router.get("/stats/products", response_model=Dict[str, Any])
async def get_product_stats(_=Depends(admin_required)):
    # Since the method doesn't exist in admin_controller yet, we'll return a basic structure
    return {"message": "Product statistics endpoint not implemented yet"}


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
        _=Depends(admin_required),
        role: str = Query(None),
        query: str = Query(None),
        page: int = Query(1, ge=1),
        size: int = Query(10, ge=1, le=100)
):
    return await user_controller.get_users(role=role, query=query, page=page, size=size)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
        user_id: str = Path(...),
        _=Depends(admin_required)
):
    user = await user_controller.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
        user_id: str = Path(...),
        user_update: UserUpdate = Body(...),
        _=Depends(admin_required)
):
    updated_user = await user_controller.update_user(user_id, user_update)

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return updated_user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user_id: str = Path(...),
        current_user=Depends(admin_required)
):
    # Prevent admin from deleting their own account
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )

    deleted = await user_controller.delete_user(user_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )