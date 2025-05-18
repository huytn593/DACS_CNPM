# app/backend/routes/upload.py
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from typing import List

from app.backend.utils.auth import get_current_user
from app.backend.utils.file_upload import save_upload_files

router = APIRouter(tags=["upload"])


@router.post("/upload/image", response_model=dict)
async def upload_image(
        file: UploadFile = File(...),
        _=Depends(get_current_user)  # Use underscore to indicate intentional unused param
):
    # Validate file type
    content_type = file.content_type
    if not content_type or not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed"
        )

    # Save file as a single-element list
    file_paths = await save_upload_files([file], "images")
    file_path = file_paths[0] if file_paths else ""

    # Return file URL
    return {
        "filename": file.filename,
        "content_type": content_type,
        "file_path": file_path,
        "url": f"/uploads/{file_path}"
    }


@router.post("/upload/images", response_model=List[dict])
async def upload_multiple_images(
        files: List[UploadFile] = File(...),
        _=Depends(get_current_user)  # Use underscore to indicate intentional unused param
):
    # Validate file types
    for file in files:
        content_type = file.content_type
        if not content_type or not content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only image files are allowed"
            )

    # Save files
    file_paths = await save_upload_files(files, "images")

    # Return file URLs
    result = []
    for i, file in enumerate(files):
        if i < len(file_paths):  # Make sure we don't go out of bounds
            result.append({
                "filename": file.filename,
                "content_type": file.content_type,
                "file_path": file_paths[i],
                "url": f"/uploads/{file_paths[i]}"
            })

    return result
