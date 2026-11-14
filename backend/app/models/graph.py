"""Curriculum graph, stored relationally.

The graph is ordinary relational rows: units, one row per prerequisite edge
and one row per concept-passage link. A course has tens to a few hundred
concepts, so graph traversal is done in Python after one query per table.
`ConceptChunk.chunk_id` is the Chroma passage id, which is how the graph
branch of retrieval reaches passages in the vector store.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CourseUnit(Base):
    """A syllabus unit, with the lecture hours the syllabus assigns to it (H_u)."""

    __tablename__ = "course_units"
    __table_args__ = (UniqueConstraint("course_id", "number", name="uq_course_units_course_number"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lecture_hours: Mapped[float | None] = mapped_column(Float, nullable=True)


class ConceptPrerequisite(Base):
    """Edge a -> b: concept `concept_id` (a) requires `prerequisite_id` (b) first.

    `explicit`, `order` and `cooccurrence` are the three signals of Eq. (1);
    `confidence` is their weighted sum. Instructor edges have source
    'instructor' and confidence 1. `status` is 'active', 'rejected' (an
    instructor turned it down, so rebuilds don't bring it back) or 'cycle'
    (removed automatically to keep the graph acyclic).
    """

    __tablename__ = "prerequisite_edges"
    __table_args__ = (
        UniqueConstraint("concept_id", "prerequisite_id", name="uq_concept_prereq_pair"),
        CheckConstraint("concept_id <> prerequisite_id", name="ck_concept_prereq_not_self"),
        CheckConstraint("source IN ('auto', 'instructor')", name="ck_concept_prereq_source"),
        CheckConstraint("status IN ('active', 'rejected', 'cycle')", name="ck_concept_prereq_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    explicit: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    order: Mapped[float] = mapped_column("order_signal", Float, nullable=False, default=0.0)
    cooccurrence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Short quote of the passage that states the dependency, when there is one.
    evidence: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="auto")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ConceptChunk(Base):
    """EXTRACTED_FROM: a concept is taught in this passage of the vector index."""

    __tablename__ = "concept_passages"
    __table_args__ = (UniqueConstraint("concept_id", "chunk_id", name="uq_concept_passages_pair"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_id: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False
    )
    resource_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # 1.0 when the concept title appears verbatim, else the embedding similarity.
    score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)


class CourseGraphStatus(Base):
    """Outcome of the last graph build for a course, shown to the instructor."""

    __tablename__ = "course_graph_status"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), primary_key=True
    )
    state: Mapped[str] = mapped_column(String(20), nullable=False, default="idle")
    # {concepts_extracted, extraction_method, edges, cycles_removed, links, ...}
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class StudyPlan(Base):
    """A student's planning inputs for one course; the path itself is recomputed on demand."""

    __tablename__ = "study_plans"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_study_plans_user_course"),
        CheckConstraint("objective IN ('exam', 'revision', 'new_subject')", name="ck_study_plans_objective"),
        CheckConstraint("hours_per_day > 0 AND hours_per_day <= 16", name="ck_study_plans_hours"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    objective: Mapped[str] = mapped_column(String(20), nullable=False, default="exam")
    exam_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hours_per_day: Mapped[float] = mapped_column(Numeric(4, 2), nullable=False, default=2)
    # Unit numbers the plan targets; empty means the whole syllabus.
    target_units: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
