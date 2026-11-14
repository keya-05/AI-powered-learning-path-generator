import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    # Required for instructors; derived from the title for a student's own subject.
    code: str | None = Field(default=None, max_length=50)
    description: str | None = None
    # Topics to track, in study order, e.g. "Unit 2: Hashing" or just "Hashing".
    topics: list[str] = Field(default_factory=list, max_length=60)


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    code: str
    description: str | None
    user_id: uuid.UUID
    created_at: datetime
    is_personal: bool = False


class CourseSummaryResponse(CourseResponse):
    """Extends CourseResponse with derived analytics for the dashboard."""

    overall_mastery: float = Field(ge=0.0, le=1.0)
    total_concepts: int
    weak_concept_count: int
    enrolled_count: int | None = None
    # Only sent to the course's instructor.
    join_code: str | None = None


class ConceptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    unit_number: int


class CourseJoinRequest(BaseModel):
    code: str = Field(min_length=4, max_length=20)


class JoinCodeResponse(BaseModel):
    join_code: str
