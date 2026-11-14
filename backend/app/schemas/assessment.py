import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AssessmentMode = Literal["weak_focus", "balanced", "new_subject", "revision", "exam_prep"]
PaperMode = Literal["weak_focus", "balanced", "assigned", "new_subject", "revision", "exam_prep"]


class BlueprintTopic(BaseModel):
    concept_id: uuid.UUID
    title: str
    unit_number: int
    mastery: float | None
    included: bool
    question_count: int


class AssessmentBlueprint(BaseModel):
    course_id: uuid.UUID
    mode: AssessmentMode
    question_count: int
    topics: list[BlueprintTopic]


class AssessmentCreateRequest(BaseModel):
    course_id: uuid.UUID
    mode: AssessmentMode = "weak_focus"
    question_count: int = Field(default=10, ge=5, le=25)
    # Empty means every concept in the course.
    concept_ids: list[uuid.UUID] = Field(default_factory=list)


class AssessmentSubmitRequest(BaseModel):
    # question id -> chosen option index
    answers: dict[str, int]


class QuestionView(BaseModel):
    id: str
    concept_id: uuid.UUID
    concept_title: str
    prompt: str
    options: list[str]
    # Only filled in once the paper is submitted.
    answer_index: int | None = None
    explanation: str | None = None
    chosen_index: int | None = None


class TopicResult(BaseModel):
    concept_id: uuid.UUID
    concept_title: str
    correct: int
    total: int
    mastery_before: float | None
    mastery_after: float | None


class AssessmentSummary(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_code: str
    course_title: str
    mode: PaperMode
    title: str
    question_count: int
    status: Literal["in_progress", "completed"]
    score: float | None
    created_at: datetime
    submitted_at: datetime | None
    # Filled in for an attempt at an instructor's assignment.
    assignment_id: uuid.UUID | None = None
    due_at: datetime | None = None
    instructions: str | None = None


class AssessmentDetail(AssessmentSummary):
    questions: list[QuestionView]
    topic_results: list[TopicResult] = Field(default_factory=list)


class AssignmentCreateRequest(BaseModel):
    course_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    instructions: str | None = Field(default=None, max_length=2000)
    due_at: datetime | None = None
    question_count: int = Field(default=10, ge=5, le=25)
    # Empty means every concept in the course.
    concept_ids: list[uuid.UUID] = Field(default_factory=list)


class AssignmentQuestion(BaseModel):
    id: str
    concept_title: str
    prompt: str
    options: list[str]
    answer_index: int
    explanation: str


class StudentAttempt(BaseModel):
    student_name: str
    student_email: str
    status: Literal["not_started", "in_progress", "completed"]
    score: float | None
    submitted_at: datetime | None
    late: bool


class AssignmentSummary(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    course_code: str
    course_title: str
    title: str
    instructions: str | None
    due_at: datetime | None
    question_count: int
    created_at: datetime
    # Instructor view
    enrolled_count: int | None = None
    submitted_count: int | None = None
    average_score: float | None = None
    # Student view: their own attempt
    paper_id: uuid.UUID | None = None
    status: Literal["not_started", "in_progress", "completed"] | None = None
    score: float | None = None


class AssignmentDetail(AssignmentSummary):
    questions: list[AssignmentQuestion]
    attempts: list[StudentAttempt]
