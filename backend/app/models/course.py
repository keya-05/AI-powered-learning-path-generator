import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("user_id", "code", name="uq_courses_user_code"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Teachers share this so students can enrol directly. None for a student's own subject.
    join_code: Mapped[str | None] = mapped_column(String(12), unique=True, nullable=True)
    # The school whose students see this course in their catalog.
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="courses")
    resources: Mapped[list["Resource"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
    concepts: Mapped[list["Concept"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )

    @property
    def is_personal(self) -> bool:
        """A subject a student made for themselves: no instructor, only their own uploads."""
        return self.owner.role == "student"
