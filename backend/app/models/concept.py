import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Concept(Base):
    __tablename__ = "concepts"
    __table_args__ = (
        UniqueConstraint("course_id", "title", name="uq_concepts_course_title"),
        CheckConstraint("unit_number >= 1", name="ck_concepts_unit_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit_number: Mapped[int] = mapped_column(Integer, nullable=False)
    # Position within its unit in the syllabus (used for the order signal o_ab).
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 'manual' (typed by the course creator) or 'extracted' (from the syllabus).
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    # M_c of Eq. (4): total marks of past-paper questions mapped to this concept.
    exam_marks: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    course: Mapped["Course"] = relationship(back_populates="concepts")
    knowledge_profiles: Mapped[list["StudentKnowledgeProfile"]] = relationship(
        back_populates="concept", cascade="all, delete-orphan"
    )
