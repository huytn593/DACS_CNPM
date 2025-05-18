# app/backend/utils/file_upload.py
import os
from fastapi import UploadFile
from typing import List
import uuid
from datetime import datetime
from app.config import settings


async def save_upload_files(files: List[UploadFile], folder: str) -> List[str]:
    """
    Save uploaded files to a specified folder and return the file paths.

    Args:
        files: List of uploaded files
        folder: Subfolder name for organization (e.g., 'products', 'users')

    Returns:
        List of file paths relative to the media folder
    """
    # Create base upload folder if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Create specific folder
    upload_folder = os.path.join(settings.UPLOAD_DIR, folder)
    os.makedirs(upload_folder, exist_ok=True)

    # Create date-based folder for better organization
    today = datetime.now().strftime("%Y-%m-%d")
    date_folder = os.path.join(upload_folder, today)
    os.makedirs(date_folder, exist_ok=True)

    saved_paths = []

    for file in files:
        if not file.filename:
            continue

        # Generate unique filename
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(date_folder, filename)

        # Save file with type-safe approach
        contents = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(contents)

        # Get path relative to UPLOAD_DIR
        relative_path = os.path.relpath(file_path, settings.UPLOAD_DIR)
        relative_path = relative_path.replace("\\", "/")  # Normalize for all operating systems

        saved_paths.append(f"/media/{relative_path}")

    return saved_paths


async def delete_file(file_path: str) -> bool:
    """
    Delete a file from the upload directory.

    Args:
        file_path: The path of the file to delete (should start with "/media/")

    Returns:
        Whether the file was successfully deleted
    """
    if not file_path.startswith("/media/"):
        return False

    # Get the actual file path
    actual_path = os.path.join(settings.UPLOAD_DIR, file_path[7:])

    # Check if file exists
    if not os.path.exists(actual_path):
        return False

    # Delete file
    try:
        os.remove(actual_path)
        return True
    except (OSError, IOError, PermissionError) as e:
        # Specify the exceptions we expect might occur
        return False