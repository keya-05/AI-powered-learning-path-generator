import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StudentKnowledgeProfile(Base):
    __tablename__ = "student_knowledge_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", "concept_id", name="uq_skp_user_concept"),
        CheckConstraint(
            "mastery_score >= 0.0 AND mastery_score <= 1.0", name="ck_skp_mastery_score_range"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    concept_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False
    )
    mastery_score: Mapped[float] = mapped_column(Numeric(3, 2), nullable=False, default=0.0)
    last_assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    concept: Mapped["Concept"] = relationship(back_populates="knowledge_profiles")
