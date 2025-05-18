# app/backend/routes/wishlist.py
from fastapi import APIRouter, Depends, Path, HTTPException, status
from typing import List

from app.backend.models.wishlist import WishlistItemResponse
from app.backend.controllers import wishlist_controller
from app.backend.utils.auth import get_current_user

router = APIRouter(tags=["wishlist"])


@router.post("/wishlist/{product_id}", response_model=WishlistItemResponse)
async def add_to_wishlist(
        product_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    return await wishlist_controller.add_to_wishlist(current_user["id"], product_id)


@router.get("/wishlist", response_model=List[WishlistItemResponse])
async def get_wishlist(current_user=Depends(get_current_user)):
    return await wishlist_controller.get_wishlist(current_user["id"])


@router.delete("/wishlist/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
        product_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    deleted = await wishlist_controller.remove_from_wishlist(current_user["id"], product_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in wishlist"
        )


@router.get("/wishlist/check/{product_id}", response_model=dict)
async def check_wishlist(
        product_id: str = Path(...),
        current_user=Depends(get_current_user)
):
    is_in_wishlist = await wishlist_controller.is_in_wishlist(current_user["id"], product_id)
    return {"in_wishlist": is_in_wishlist}


@router.delete("/wishlist", status_code=status.HTTP_204_NO_CONTENT)
async def clear_wishlist(current_user=Depends(get_current_user)):
    count = await wishlist_controller.clear_wishlist(current_user["id"])
    return {"deleted_count": count}