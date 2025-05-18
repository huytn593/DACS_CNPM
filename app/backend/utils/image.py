# app/backend/utils/image.py
import os
import uuid
import shutil
from fastapi import UploadFile
from typing import List, Optional

UPLOAD_DIR = "static/uploads"


async def save_uploaded_image(file: UploadFile) -> Optional[str]:
    """
    Save an uploaded image file to the uploads directory.
    Returns the relative path to the saved image, or None if the save failed.
    """
    if not file:
        return None

    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate a unique filename
    filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return the relative path
        return f"/{file_path}"
    except Exception as e:
        print(f"Error saving image: {e}")
        return None
    finally:
        file.file.close()


async def delete_image(image_path: str) -> bool:
    """
    Delete an image from the uploads directory.
    """
    if not image_path:
        return False

    # Remove leading slash if present
    if image_path.startswith('/'):
        image_path = image_path[1:]

    full_path = os.path.join(os.getcwd(), image_path)

    try:
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting image: {e}")
        return False