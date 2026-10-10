import uuid
from datetime import datetime

from pydantic import BaseModel


class UnitMastery(BaseModel):
    unit_number: int
    label: str
    mastery: float
    concept_count: int


class StudentStanding(BaseModel):
    student_id: uuid.UUID
    email: str
    display_name: str
    mastery: float | None
    weak_concept_count: int
    weakest_concept: str | None
    weakest_unit: int | None


class ConceptStat(BaseModel):
    concept_id: uuid.UUID
    course_id: uuid.UUID
    title: str
    unit_number: int
    average_mastery: float | None
    struggling_pct: float
    students_assessed: int
    students_struggling: int


class ResourceSummary(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_code: str
    file_name: str
    file_type: str
    resource_type: str
    processing_status: str
    created_at: datetime


class InstructorTotals(BaseModel):
    courses: int
    students: int
    concepts: int
    resources: int
    average_mastery: float | None


class InstructorOverview(BaseModel):
    totals: InstructorTotals
    unit_mastery: list[UnitMastery]
    students: list[StudentStanding]
    concepts: list[ConceptStat]
    resources: list[ResourceSummary]


class StudentConcept(BaseModel):
    concept_id: uuid.UUID
    course_id: uuid.UUID
    course_code: str
    title: str
    unit_number: int
    mastery: float | None
    status: str  # "mastered" | "gap" | "not_assessed"


class StudentOverview(BaseModel):
    average_mastery: float | None
    concepts_assessed: int
    concepts_total: int
    gap_count: int
    unit_mastery: list[UnitMastery]
    concepts: list[StudentConcept]
    weakest_concept: StudentConcept | None
