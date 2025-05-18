# app/backend/controllers/report_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import List, Optional, Dict

from ..models.report import ReportCreate, ReportUpdate, Report, ReportResponse, ReportStatus
from ..utils.database import get_db


async def create_report(user_id: str, report_data: ReportCreate) -> ReportResponse:
    db = get_db()

    # Check if product exists
    product = await db.products.find_one({"id": report_data.product_id})
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if user has already reported this product
    existing_report = await db.reports.find_one({
        "user_id": user_id,
        "product_id": report_data.product_id,
        "status": {"$ne": ReportStatus.dismissed}  # Allow re-reporting if previous was dismissed
    })

    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reported this product and your report is still being processed"
        )

    # Get user name for the report
    user = await db.users.find_one({"id": user_id})
    user_name = user.get("full_name", "Unknown User") if user else "Unknown User"

    # Create report
    report = Report(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **report_data.model_dump(),
        status=ReportStatus.pending,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC)
    )

    await db.reports.insert_one(report.model_dump())

    # Return with product details
    return ReportResponse(
        **report.model_dump(),
        product_name=product.get("name"),
        product_image=product.get("images", [""])[0] if product.get("images") else None,
        reporter_name=user_name
    )


async def get_reports(
        status: Optional[ReportStatus] = None,
        page: int = 1,
        size: int = 20
) -> Dict:
    db = get_db()

    # Build query
    query = {}
    if status:
        query["status"] = status

    # Calculate skip value for pagination
    skip = (page - 1) * size

    # Get total count
    total_count = await db.reports.count_documents(query)

    # Get reports
    cursor = db.reports.find(query) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(size)

    reports = await cursor.to_list(length=None)

    # Enhance reports with product and user details
    enhanced_reports = []

    for report in reports:
        # Get product details
        product = await db.products.find_one({"id": report["product_id"]})
        product_name = product.get("name", "Unknown Product") if product else "Unknown Product"
        product_image = product.get("images", [""])[0] if product and product.get("images") else None

        # Get user name
        user = await db.users.find_one({"id": report["user_id"]})
        user_name = user.get("full_name", "Unknown User") if user else "Unknown User"

        enhanced_reports.append(
            ReportResponse(
                **report,
                product_name=product_name,
                product_image=product_image,
                reporter_name=user_name
            )
        )

    # Calculate total pages
    total_pages = (total_count + size - 1) // size

    return {
        "items": enhanced_reports,
        "total": total_count,
        "page": page,
        "size": size,
        "pages": total_pages
    }


async def get_report(report_id: str) -> Optional[ReportResponse]:
    db = get_db()

    report = await db.reports.find_one({"id": report_id})
    if not report:
        return None

    # Get product details
    product = await db.products.find_one({"id": report["product_id"]})
    product_name = product.get("name", "Unknown Product") if product else "Unknown Product"
    product_image = product.get("images", [""])[0] if product and product.get("images") else None

    # Get user name
    user = await db.users.find_one({"id": report["user_id"]})
    user_name = user.get("full_name", "Unknown User") if user else "Unknown User"

    return ReportResponse(
        **report,
        product_name=product_name,
        product_image=product_image,
        reporter_name=user_name
    )


async def update_report(report_id: str, report_update: ReportUpdate) -> Optional[ReportResponse]:
    db = get_db()

    # Get report
    report = await db.reports.find_one({"id": report_id})
    if not report:
        return None

    # Prepare update data
    update_data = {k: v for k, v in report_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)

    # Update report
    await db.reports.update_one(
        {"id": report_id},
        {"$set": update_data}
    )

    # Get updated report
    updated_report = await db.reports.find_one({"id": report_id})

    # Get product details
    product = await db.products.find_one({"id": updated_report["product_id"]})
    product_name = product.get("name", "Unknown Product") if product else "Unknown Product"
    product_image = product.get("images", [""])[0] if product and product.get("images") else None

    # Get user name
    user = await db.users.find_one({"id": updated_report["user_id"]})
    user_name = user.get("full_name", "Unknown User") if user else "Unknown User"

    return ReportResponse(
        **updated_report,
        product_name=product_name,
        product_image=product_image,
        reporter_name=user_name
    )


async def get_user_reports(user_id: str) -> List[ReportResponse]:
    db = get_db()

    cursor = db.reports.find({"user_id": user_id}).sort("created_at", -1)
    reports = await cursor.to_list(length=None)

    # Enhance reports with product details
    enhanced_reports = []

    for report in reports:
        # Get product details
        product = await db.products.find_one({"id": report["product_id"]})
        product_name = product.get("name", "Unknown Product") if product else "Unknown Product"
        product_image = product.get("images", [""])[0] if product and product.get("images") else None

        enhanced_reports.append(
            ReportResponse(
                **report,
                product_name=product_name,
                product_image=product_image,
                reporter_name=""  # No need for reporter_name in user's own reports
            )
        )

    return enhanced_reports