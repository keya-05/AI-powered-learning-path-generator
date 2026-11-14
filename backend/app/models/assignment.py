import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Assignment(Base):
    """A paper an instructor sets for everyone enrolled in a course.

    Every student answers the same `questions` (same shape as a practice
    paper's). Each student's attempt is a practice paper with
    `assignment_id` pointing here, so grading and mastery updates are shared.
    """

    __tablename__ = "course_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    questions: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    course: Mapped["Course"] = relationship()
    attempts: Mapped[list["Assessment"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan", passive_deletes=True
    )
