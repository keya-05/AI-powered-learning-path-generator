import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    file_name: str
    file_type: str
    resource_type: str
    storage_url: str
    processing_status: str
    created_at: datetime


class StudentResourceResponse(BaseModel):
    """A course file as a student sees it: no server paths."""

    id: uuid.UUID
    course_id: uuid.UUID
    file_name: str
    file_type: str
    resource_type: str
    created_at: datetime
    available: bool
    processing_status: str
