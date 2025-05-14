from datetime import datetime, UTC
from bson import ObjectId
from fastapi import HTTPException, status
from typing import List, Optional

from ..models.report import ReportCreate, ReportResponse, ReportUpdate
from ..utils.database import database


async def create_report(product_id: str, user_id: str, report: ReportCreate) -> ReportResponse:
    """
    Report a product for inappropriate content
    """
    db = await database()

    # Kiểm tra sản phẩm có tồn tại không
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Kiểm tra xem người dùng đã tố cáo sản phẩm này chưa
    existing_report = await db.reports.find_one({
        "user_id": ObjectId(user_id),
        "product_id": ObjectId(product_id)
    })

    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reported this product"
        )

    # Tạo report mới
    report_data = {
        "product_id": ObjectId(product_id),
        "user_id": ObjectId(user_id),
        "description": report.description,
        "reported_link": report.reported_link,
        "status": "pending",
        "created_at": datetime.now(UTC),
        "updated_at": None
    }

    result = await db.reports.insert_one(report_data)

    # Lấy report đã tạo
    created_report = await db.reports.find_one({"_id": result.inserted_id})

    return ReportResponse(
        id=str(created_report["_id"]),
        product_id=str(created_report["product_id"]),
        user_id=str(created_report["user_id"]),
        description=created_report["description"],
        reported_link=created_report.get("reported_link"),
        status=created_report["status"],
        created_at=created_report["created_at"],
        updated_at=created_report.get("updated_at")
    )


async def get_reports(
        skip: int = 0,
        limit: int = 100,
        report_status: Optional[str] = None  # Renamed from 'status' to 'report_status'
) -> List[ReportResponse]:
    """
    Get all reports with optional status filter
    """
    db = await database()

    # Xây dựng query
    query = {}
    if report_status:  # Updated to use the new parameter name
        query["status"] = report_status

    reports = []
    cursor = db.reports.find(query).skip(skip).limit(limit).sort("created_at", -1)

    async for report in cursor:
        reports.append(
            ReportResponse(
                id=str(report["_id"]),
                product_id=str(report["product_id"]),
                user_id=str(report["user_id"]),
                description=report["description"],
                reported_link=report.get("reported_link"),
                status=report["status"],
                created_at=report["created_at"],
                updated_at=report.get("updated_at")
            )
        )

    return reports


async def update_report_status(report_id: str, update: ReportUpdate) -> ReportResponse:
    """
    Update report status (for admin)
    """
    db = await database()

    # Kiểm tra report có tồn tại không
    report = await db.reports.find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Cập nhật trạng thái
    await db.reports.update_one(
        {"_id": ObjectId(report_id)},
        {
            "$set": {
                "status": update.status,
                "updated_at": datetime.now(UTC)
            }
        }
    )

    # Lấy report đã cập nhật
    updated_report = await db.reports.find_one({"_id": ObjectId(report_id)})

    return ReportResponse(
        id=str(updated_report["_id"]),
        product_id=str(updated_report["product_id"]),
        user_id=str(updated_report["user_id"]),
        description=updated_report["description"],
        reported_link=updated_report.get("reported_link"),
        status=updated_report["status"],
        created_at=updated_report["created_at"],
        updated_at=updated_report.get("updated_at")
    )