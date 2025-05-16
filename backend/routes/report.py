from fastapi import APIRouter, Depends, Path, Body, status

from ..models.report import ProductReportCreate, ProductReportResponse
from ..utils.auth import get_current_user
from ..controllers.report_controller import create_product_report

router = APIRouter(tags=["reports"])


@router.post("/products/{product_id}/report", response_model=ProductReportResponse, status_code=status.HTTP_201_CREATED)
async def report_product(
        product_id: str = Path(...),
        report_data: ProductReportCreate = Body(...),
        current_user: dict = Depends(get_current_user)
):
    """
    Report a product for inappropriate content
    """
    return await create_product_report(
        user_id=current_user["id"],
        product_id=product_id,
        report_data=report_data
    )