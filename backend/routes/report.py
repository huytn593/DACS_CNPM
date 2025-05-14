from fastapi import APIRouter, Depends, Path, Body, HTTPException, status
from typing import List

from ..models.report import ReportCreate, ReportResponse, ReportUpdate
from ..utils.auth import get_current_user
from ..controllers.report_controller import create_report, get_reports, update_report_status

router = APIRouter(tags=["reports"])


@router.post("/products/{product_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_product(
        product_id: str = Path(...),
        report: ReportCreate = Body(...),
        current_user: dict = Depends(get_current_user)
):
    """
    Report a product for inappropriate content
    """
    return await create_report(product_id=product_id, user_id=current_user.id, report=report)