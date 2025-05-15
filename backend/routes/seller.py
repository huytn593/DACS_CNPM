from fastapi import APIRouter, Depends, status, Body
from ..models.product import ProductCreate, ProductUpdate, ProductResponse
from ..models.order import OrderResponse
from typing import Optional
from ..controllers.seller_controller import (
    create_product,
    update_product,
    delete_product,
    get_seller_products,
    get_seller_orders,
    update_order_status
)
from ..utils.auth import seller_required

router = APIRouter(
    prefix="/seller",
    tags=["seller"],
    dependencies=[Depends(seller_required)]  # Tất cả các endpoint trong router này đều yêu cầu seller role
)

@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def add_product(product: ProductCreate, current_user=Depends(seller_required)):
    # Chỉ seller mới có thể thêm sản phẩm
    return await create_product(product, current_user["id"])

@router.put("/products/{product_id}", response_model=ProductResponse)
async def edit_product(product_id: str, product: ProductUpdate, current_user=Depends(seller_required)):
    # Chỉ seller mới có thể chỉnh sửa sản phẩm
    return await update_product(product_id, product, current_user["id"])

@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_product(product_id: str, current_user=Depends(seller_required)):
    # Chỉ seller mới có thể xóa sản phẩm
    await delete_product(product_id, current_user["id"])
    return {"detail": "Product deleted successfully"}

@router.get("/products", response_model=list[ProductResponse])
async def list_seller_products(current_user=Depends(seller_required)):
    # Lấy tất cả sản phẩm của seller hiện tại
    return await get_seller_products(current_user["id"])

@router.get("/orders", response_model=list[OrderResponse])
async def list_seller_orders(
    order_status: Optional[str] = None,
    current_user=Depends(seller_required)
):
    """
    Lấy các đơn hàng có chứa sản phẩm của seller
    """
    return await get_seller_orders(current_user["id"], order_status)

@router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_seller_order_status(
    order_id: str,
    order_status: str = Body(...),
    current_user=Depends(seller_required)
):
    """
    Cập nhật trạng thái đơn hàng của seller
    """
    return await update_order_status(order_id, order_status, current_user["id"])