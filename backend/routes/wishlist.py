from fastapi import APIRouter, Depends, Body
from ..controllers import wishlist_controller
from ..models.wishlist import WishlistItemCreate, WishlistResponse
from ..utils.auth import get_current_user

router = APIRouter(tags=["wishlist"])

@router.get("/wishlist", response_model=WishlistResponse)
async def get_wishlist(current_user = Depends(get_current_user)):
    """Get user's wishlist"""
    return await wishlist_controller.get_user_wishlist(user_id=current_user["id"])


@router.post("/wishlist/add", response_model=WishlistResponse)
async def add_to_wishlist(
    item: WishlistItemCreate,
    current_user = Depends(get_current_user)
):
    """Add product to wishlist"""
    return await wishlist_controller.add_to_wishlist(
        user_id=current_user["id"],
        product_id=item.product_id
    )


@router.delete("/wishlist/remove", response_model=WishlistResponse)
async def remove_from_wishlist(
    item_id: str = Body(..., embed=True),
    current_user = Depends(get_current_user)
):
    """Remove item from wishlist"""
    return await wishlist_controller.remove_from_wishlist(
        user_id=current_user["id"],
        item_id=item_id
    )


@router.delete("/wishlist/clear", response_model=WishlistResponse)
async def clear_wishlist(current_user = Depends(get_current_user)):
    """Clear all items from wishlist"""
    return await wishlist_controller.clear_wishlist(user_id=current_user["id"])