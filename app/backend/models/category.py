# app/backend/models/category.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image: Optional[str] = None

class Category(CategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

class CategoryResponse(Category):
    product_count: Optional[int] = 0
    subcategories: Optional[List['CategoryResponse']] = []

# Need to update the forward reference
CategoryResponse.model_rebuild()