# app/backend/utils/file_upload.py
import os
from fastapi import UploadFile
from typing import List
import uuid
from datetime import datetime
from app.config import settings

def ensure_placeholder_image():
    """
    Ensures that a placeholder image exists in the uploads directory.
    Creates a simple SVG placeholder if it doesn't exist.
    """
    placeholder_path = os.path.join(settings.UPLOAD_DIR, 'placeholder.svg')
    if not os.path.exists(placeholder_path):
        svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" version="1.1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
 <rect width="200" height="200" fill="#f0f0f0"/>
 <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="14" fill="#666">No Image</text>
</svg>'''
        with open(placeholder_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)

# Call this when the module is imported
ensure_placeholder_image()

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

    saved_paths = []

    try:
        # Save each file
        for file in files:
            if file.filename:
                # Generate unique filename with date prefix
                file_extension = os.path.splitext(file.filename)[1]
                today = datetime.now().strftime("%Y%m%d")
                unique_filename = f"{today}_{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(upload_folder, unique_filename)

                # Save file
                with open(file_path, "wb") as f:
                    f.write(await file.read())

                # Add relative path to list
                saved_paths.append(f"/uploads/{folder}/{unique_filename}")

        return saved_paths

    except (OSError, IOError, PermissionError) as e:
        # Log the error for debugging
        print(f"Error saving files: {str(e)}")
        # Return empty list on error to maintain return type
        return []


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
    except (OSError, IOError, PermissionError):
        # Log the error for debugging
        print(f"Error deleting file: {file_path}")
        return False