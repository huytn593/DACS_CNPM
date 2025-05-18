# app/backend/routes/report.py
from fastapi import APIRouter, Depends, Path, Body, HTTPException, status, Query
from typing import List, Optional

from app.backend.models.report import ReportCreate, ReportUpdate, ReportResponse, ReportStatus
from app.backend.controllers import report_controller
from app.backend.utils.auth import get_current_user, admin_required

router = APIRouter(tags=["reports"])


@router.post("/products/{product_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_product(
        product_id: str = Path(...),
        report_data: ReportCreate = Body(...),
        current_user=Depends(get_current_user)
):
    # Override product_id from path
    report_data.product_id = product_id

    return await report_controller.create_report(current_user["id"], report_data)


@router.get("/admin/reports", response_model=dict)
async def get_reports(
        status: Optional[ReportStatus] = None,
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=100),
        _=Depends(admin_required)
):
    return await report_controller.get_reports(status, page, size)


@router.get("/admin/reports/{report_id}", response_model=ReportResponse)
async def get_report(
        report_id: str = Path(...),
        _=Depends(admin_required)
):
    report = await report_controller.get_report(report_id)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    return report


@router.put("/admin/reports/{report_id}", response_model=ReportResponse)
async def update_report(
        report_id: str = Path(...),
        report_update: ReportUpdate = Body(...),
        _=Depends(admin_required)
):
    updated_report = await report_controller.update_report(report_id, report_update)

    if not updated_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    return updated_report


@router.get("/user/reports", response_model=List[ReportResponse])
async def get_user_reports(current_user=Depends(get_current_user)):
    return await report_controller.get_user_reports(current_user["id"])