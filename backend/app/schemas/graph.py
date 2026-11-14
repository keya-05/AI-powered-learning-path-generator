import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Objective = Literal["exam", "revision", "new_subject"]


class GraphUnit(BaseModel):
    number: int
    title: str | None
    lecture_hours: float | None


class GraphConcept(BaseModel):
    id: uuid.UUID
    title: str
    unit_number: int
    position: int
    source: str
    exam_marks: float
    passage_count: int


class GraphEdge(BaseModel):
    id: uuid.UUID
    concept_id: uuid.UUID
    prerequisite_id: uuid.UUID
    confidence: float
    explicit: float
    order: float
    cooccurrence: float
    evidence: str | None
    source: str
    status: str


class GraphStatus(BaseModel):
    state: str
    details: dict | None
    updated_at: datetime | None


class CourseGraphResponse(BaseModel):
    course_id: uuid.UUID
    status: GraphStatus
    units: list[GraphUnit]
    concepts: list[GraphConcept]
    edges: list[GraphEdge]


class EdgeCreateRequest(BaseModel):
    concept_id: uuid.UUID = Field(description="The concept that requires the prerequisite.")
    prerequisite_id: uuid.UUID


class EdgeUpdateRequest(BaseModel):
    status: Literal["active", "rejected"]


class StudyPlanSettings(BaseModel):
    objective: Objective = "exam"
    exam_date: date | None = None
    hours_per_day: float = Field(default=2.0, gt=0, le=16)
    target_units: list[int] = Field(default_factory=list, max_length=30)


class PlanPrerequisite(BaseModel):
    concept_id: uuid.UUID
    title: str
    state: Literal["mastered", "scheduled", "deferred"]


class PlanMaterial(BaseModel):
    resource_id: uuid.UUID
    file_name: str
    resource_type: str


class PlanStep(BaseModel):
    order: int
    concept_id: uuid.UUID
    title: str
    unit_number: int
    mastery: float | None
    mastery_used: float
    exam_relevance: float
    dependency_share: float
    priority: float
    hours: float
    start_hour: float
    end_hour: float
    start_day: int
    end_day: int
    prerequisites: list[PlanPrerequisite]
    materials: list[PlanMaterial]


class DeferredConcept(BaseModel):
    concept_id: uuid.UUID
    title: str
    unit_number: int
    hours: float
    priority: float
    is_target: bool


class SkippedConcept(BaseModel):
    concept_id: uuid.UUID
    title: str
    mastery: float | None


class LearningPathResponse(BaseModel):
    course_id: uuid.UUID
    objective: Objective
    hours_per_day: float
    exam_date: date | None
    days_remaining: int | None
    budget_hours: float | None
    used_hours: float
    extra_hours: float
    weights: list[float]
    tau: float
    target_units: list[int]
    exam_data: bool
    edge_count: int
    units: list[int]
    steps: list[PlanStep]
    deferred: list[DeferredConcept]
    skipped_mastered: list[SkippedConcept]
