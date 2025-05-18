from pydantic import BaseModel, Field
from typing import List

class ComparisonRequest(BaseModel):
    product_ids: List[str] = Field(..., min_length=2, max_length=4)
