import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, UniqueConstraint, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Assessment(Base):
    """A practice paper a student generated for themselves.

    `questions` is a list of
    {id, concept_id, concept_title, prompt, options[4], answer_index, explanation};
    `answers` maps question id -> chosen option index once submitted.
    """

    __tablename__ = "practice_papers"
    __table_args__ = (
        CheckConstraint(
            "mode IN ('weak_focus', 'balanced', 'assigned', 'new_subject', 'revision', 'exam_prep')",
            name="ck_practice_papers_mode",
        ),
        # One attempt per student per assignment.
        UniqueConstraint("student_id", "assignment_id", name="uq_practice_papers_student_assignment"),
        CheckConstraint("status IN ('in_progress', 'completed')", name="ck_practice_papers_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    # Set when this is a student's attempt at an instructor's assignment.
    assignment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("course_assignments.id", ondelete="CASCADE"), nullable=True
    )
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    questions: Mapped[list] = mapped_column(JSONB, nullable=False)
    answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Per-topic outcome written at submit time, including mastery before/after.
    topic_results: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    score: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    course: Mapped["Course"] = relationship()
    assignment: Mapped["Assignment | None"] = relationship(back_populates="attempts")
