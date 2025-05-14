from fastapi import APIRouter, Depends
from ..models.cart import CartItemCreate, CartItemUpdate, CartResponse
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["cart"])


@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """
    Lấy giỏ hàng của người dùng hiện tại
    """
    from ..controllers.cart_controller import get_user_cart
    return await get_user_cart(current_user["id"])


@router.post("/cart/items")
async def add_item_to_cart(item: CartItemCreate, current_user: dict = Depends(get_current_user)):
    """
    Thêm sản phẩm vào giỏ hàng
    """
    from ..controllers.cart_controller import get_user_cart, add_to_cart_func

    # Gọi hàm thêm sản phẩm vào giỏ hàng
    await add_to_cart_func(
        user_id=current_user["id"],
        product_id=item.product_id,
        quantity=item.quantity,
        size=item.size,
        color=item.color
    )

    # Trả về giỏ hàng cập nhật
    return await get_user_cart(current_user["id"])


@router.put("/cart/items/{item_id}")
async def update_item_in_cart(item_id: str, item_update: CartItemUpdate,
                              current_user: dict = Depends(get_current_user)):
    """
    Cập nhật số lượng sản phẩm trong giỏ hàng
    """
    from ..controllers.cart_controller import get_user_cart, update_cart_item_func

    # Gọi hàm cập nhật sản phẩm trong giỏ hàng
    await update_cart_item_func(current_user["id"], item_id, item_update)

    # Trả về giỏ hàng cập nhật
    return await get_user_cart(current_user["id"])


@router.delete("/cart/items/{item_id}")
async def delete_cart_item(item_id: str, current_user: dict = Depends(get_current_user)):
    """
    Xóa một sản phẩm khỏi giỏ hàng
    """
    from ..controllers.cart_controller import get_user_cart, remove_cart_item_func

    # Gọi hàm xóa sản phẩm khỏi giỏ hàng
    await remove_cart_item_func(current_user["id"], item_id)

    # Trả về giỏ hàng cập nhật
    return await get_user_cart(current_user["id"])


@router.delete("/cart")
async def empty_cart(current_user: dict = Depends(get_current_user)):
    """
    Xóa toàn bộ giỏ hàng
    """
    from ..controllers.cart_controller import get_user_cart, clear_cart_func

    # Gọi hàm xóa toàn bộ giỏ hàng
    await clear_cart_func(current_user["id"])

    # Trả về giỏ hàng cập nhật (sẽ trống)
    return await get_user_cart(current_user["id"])