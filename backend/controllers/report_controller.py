from fastapi import HTTPException, status
from bson import ObjectId
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, UTC
from ..utils.database import get_report_collection, get_product_collection, get_user_collection
from ..models.report import ProductReportCreate, ProductReportResponse, ProductReportUpdate
from motor.motor_asyncio import AsyncIOMotorCollection


async def create_product_report(
        user_id: str,
        product_id: str,
        report_data: ProductReportCreate
) -> ProductReportResponse:
    """Create a report for a product"""
    report_collection = get_report_collection()
    product_collection = get_product_collection()

    # Check if product exists
    try:
        product = await product_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Create report document
        report_dict = report_data.model_dump()
        report_dict.update({
            "product_id": ObjectId(product_id),
            "user_id": ObjectId(user_id),
            "status": "pending",  # Default status
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        })

        result = await report_collection.insert_one(report_dict)

        # Get the created report
        created_report = await report_collection.find_one({"_id": result.inserted_id})

        # Format response
        return ProductReportResponse(
            id=str(created_report["_id"]),
            product_id=str(created_report["product_id"]),
            user_id=str(created_report["user_id"]),
            reason=created_report["reason"],
            description=created_report["description"],
            status=created_report["status"],
            created_at=created_report["created_at"],
            updated_at=created_report["updated_at"],
            user_name="",  # Will be populated by API if needed
            product_name=product.get("name", "")
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create report: {str(e)}"
        )


async def get_product_reports(
        user_role: str,
        page: int = 1,
        limit: int = 10,
        status_filter: Optional[str] = None,
        product_id: Optional[str] = None
) -> Tuple[List[ProductReportResponse], int]:
    """Get product reports (admin only)"""
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view reports"
        )

    report_collection: AsyncIOMotorCollection = get_report_collection()
    product_collection: AsyncIOMotorCollection = get_product_collection()
    user_collection: AsyncIOMotorCollection = get_user_collection()

    # Build filter criteria
    filter_criteria: Dict[str, Any] = {}

    if status_filter:
        filter_criteria["status"] = status_filter

    if product_id:
        try:
            filter_criteria["product_id"] = ObjectId(product_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID format"
            )

    # Count total matching reports
    total = await report_collection.count_documents(filter_criteria)

    # Get paginated reports
    skip = (page - 1) * limit
    cursor = report_collection.find(filter_criteria).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)

    # Format reports with product and user info
    formatted_reports = []
    for report in reports:
        # Get product and user info
        product = await product_collection.find_one({"_id": report["product_id"]})
        user = await user_collection.find_one({"_id": report["user_id"]})

        formatted_report = ProductReportResponse(
            id=str(report["_id"]),
            product_id=str(report["product_id"]),
            user_id=str(report["user_id"]),
            reason=report["reason"],
            description=report["description"],
            status=report["status"],
            created_at=report["created_at"],
            updated_at=report["updated_at"],
            user_name=user.get("full_name", "") if user else "Unknown user",
            product_name=product.get("name", "") if product else "Unknown product"
        )
        formatted_reports.append(formatted_report)

    return formatted_reports, total


async def update_report_status(
        report_id: str,
        status: str,
        user_role: str
) -> ProductReportResponse:
    """Update the status of a product report (admin only)"""
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update report status"
        )

    report_collection = get_report_collection()
    product_collection = get_product_collection()
    user_collection = get_user_collection()

    # Validate status value
    valid_statuses = ["pending", "investigating", "resolved", "dismissed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Check if report exists
    try:
        report = await report_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        # Update report status
        update_data = {
            "status": status,
            "updated_at": datetime.now(UTC)
        }

        await report_collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_data}
        )

        # Get updated report
        updated_report = await report_collection.find_one({"_id": ObjectId(report_id)})

        # Get associated product and user info
        product = await product_collection.find_one({"_id": updated_report["product_id"]})
        user = await user_collection.find_one({"_id": updated_report["user_id"]})

        # Format response
        return ProductReportResponse(
            id=str(updated_report["_id"]),
            product_id=str(updated_report["product_id"]),
            user_id=str(updated_report["user_id"]),
            reason=updated_report["reason"],
            description=updated_report["description"],
            status=updated_report["status"],
            created_at=updated_report["created_at"],
            updated_at=updated_report["updated_at"],
            user_name=user.get("full_name", "") if user else "Unknown user",
            product_name=product.get("name", "") if product else "Unknown product"
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update report: {str(e)}"
        )