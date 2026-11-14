"""A student's prerequisite-ordered, time-bounded study plan (Algorithm 2)."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.courses import get_accessible_course_or_404
from app.api.deps import require_role
from app.db.postgres import get_db
from app.models.concept import Concept
from app.models.graph import StudyPlan
from app.models.user import User
from app.schemas.graph import LearningPathResponse, StudyPlanSettings
from app.services.path_planner import build_plan

router = APIRouter(prefix="/learning-path", tags=["learning-path"])


def _plan(db: Session, user: User, course_id: uuid.UUID, settings: StudyPlanSettings) -> LearningPathResponse:
    course = get_accessible_course_or_404(db, course_id, user)
    plan = build_plan(
        db,
        user,
        course,
        objective=settings.objective,
        hours_per_day=settings.hours_per_day,
        exam_date=settings.exam_date,
        target_units=settings.target_units,
    )
    units = sorted({u for (u,) in db.query(Concept.unit_number).filter(Concept.course_id == course_id).distinct()})
    return LearningPathResponse(**plan, units=units)


def _saved(db: Session, user: User, course_id: uuid.UUID) -> StudyPlan | None:
    return db.query(StudyPlan).filter(StudyPlan.user_id == user.id, StudyPlan.course_id == course_id).first()


@router.get("/{course_id}", response_model=LearningPathResponse)
def get_learning_path(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> LearningPathResponse:
    """The plan for the student's saved settings, recomputed from current mastery."""
    saved = _saved(db, current_user, course_id)
    settings = (
        StudyPlanSettings(
            objective=saved.objective,
            exam_date=saved.exam_date,
            hours_per_day=float(saved.hours_per_day),
            target_units=list(saved.target_units or []),
        )
        if saved
        else StudyPlanSettings()
    )
    return _plan(db, current_user, course_id, settings)


@router.put("/{course_id}", response_model=LearningPathResponse)
def update_learning_path(
    course_id: uuid.UUID,
    payload: StudyPlanSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> LearningPathResponse:
    """Save the student's goal, exam date and daily hours, and return the new plan."""
    get_accessible_course_or_404(db, course_id, current_user)
    saved = _saved(db, current_user, course_id)
    if saved is None:
        saved = StudyPlan(user_id=current_user.id, course_id=course_id)
        db.add(saved)
    saved.objective = payload.objective
    saved.exam_date = payload.exam_date
    saved.hours_per_day = payload.hours_per_day
    saved.target_units = sorted(set(payload.target_units))
    db.commit()
    return _plan(db, current_user, course_id, payload)
