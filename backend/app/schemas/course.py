import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=50)
    description: str | None = None


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    code: str
    description: str | None
    user_id: uuid.UUID
    created_at: datetime


class CourseSummaryResponse(CourseResponse):
    """Extends CourseResponse with derived analytics for the dashboard."""

    overall_mastery: float = Field(ge=0.0, le=1.0)
    total_concepts: int
    weak_concept_count: int
