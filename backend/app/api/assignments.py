"""Papers instructors set for a whole course.

Instructors create, review and delete assignments for courses they own.
Students enrolled in the course see them in Assessments, start an attempt
(a practice paper holding a copy of the questions) and submit it like any
other paper, so the result also updates their mastery.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.analytics import _display_name
from app.api.assessments import paper_detail
from app.api.courses import get_accessible_course_or_404, get_owned_course_or_404
from app.api.deps import get_current_user, require_role
from app.db.postgres import get_db
from app.models.assessment import Assessment
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.assessment import (
    AssessmentDetail,
    AssignmentCreateRequest,
    AssignmentDetail,
    AssignmentQuestion,
    AssignmentSummary,
    StudentAttempt,
)
from app.services.assessments import write_questions
from app.services.llm import AIUnavailable

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _late(assignment: Assignment, submitted_at: datetime | None) -> bool:
    return bool(assignment.due_at and submitted_at and submitted_at > assignment.due_at)


def _base(assignment: Assignment) -> dict:
    return {
        "id": assignment.id,
        "course_id": assignment.course_id,
        "course_code": assignment.course.code,
        "course_title": assignment.course.title,
        "title": assignment.title,
        "instructions": assignment.instructions,
        "due_at": assignment.due_at,
        "question_count": assignment.question_count,
        "created_at": assignment.created_at,
    }


def _instructor_summary(db: Session, assignment: Assignment) -> AssignmentSummary:
    enrolled = db.query(Enrollment).filter(Enrollment.course_id == assignment.course_id).count()
    scores = [float(a.score) for a in assignment.attempts if a.status == "completed" and a.score is not None]
    return AssignmentSummary(
        **_base(assignment),
        enrolled_count=enrolled,
        submitted_count=len(scores),
        average_score=round(sum(scores) / len(scores), 3) if scores else None,
    )


def _student_summary(assignment: Assignment, attempt: Assessment | None) -> AssignmentSummary:
    return AssignmentSummary(
        **_base(assignment),
        paper_id=attempt.id if attempt else None,
        status=attempt.status if attempt else "not_started",
        score=float(attempt.score) if attempt and attempt.score is not None else None,
    )


def _owned_assignment_or_404(db: Session, assignment_id: uuid.UUID, user: User) -> Assignment:
    assignment = (
        db.query(Assignment)
        .join(Course, Course.id == Assignment.course_id)
        .filter(Assignment.id == assignment_id, Course.user_id == user.id)
        .first()
    )
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    return assignment


@router.post("", response_model=AssignmentDetail, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> AssignmentDetail:
    course = get_owned_course_or_404(db, payload.course_id, current_user.id)
    try:
        questions = write_questions(
            db, None, course, "balanced", payload.question_count, payload.concept_ids
        )
    except AIUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

    assignment = Assignment(
        course_id=course.id,
        instructor_id=current_user.id,
        title=payload.title.strip(),
        instructions=(payload.instructions or "").strip() or None,
        due_at=payload.due_at,
        question_count=len(questions),
        questions=questions,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return get_assignment(assignment.id, db, current_user)


@router.get("", response_model=list[AssignmentSummary])
def list_assignments(
    course_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssignmentSummary]:
    if current_user.role == "instructor":
        query = (
            db.query(Assignment)
            .join(Course, Course.id == Assignment.course_id)
            .filter(Course.user_id == current_user.id)
        )
        if course_id:
            query = query.filter(Assignment.course_id == course_id)
        return [_instructor_summary(db, a) for a in query.order_by(Assignment.created_at.desc())]

    query = (
        db.query(Assignment)
        .join(Enrollment, Enrollment.course_id == Assignment.course_id)
        .filter(Enrollment.student_id == current_user.id)
    )
    if course_id:
        query = query.filter(Assignment.course_id == course_id)
    assignments = query.order_by(Assignment.due_at.asc().nulls_last(), Assignment.created_at.desc()).all()
    attempts = {
        a.assignment_id: a
        for a in db.query(Assessment).filter(
            Assessment.student_id == current_user.id,
            Assessment.assignment_id.in_([a.id for a in assignments]),
        )
    }
    return [_student_summary(a, attempts.get(a.id)) for a in assignments]


@router.get("/{assignment_id}", response_model=AssignmentDetail)
def get_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> AssignmentDetail:
    """The instructor's view: questions with answers, and every student's result."""
    assignment = _owned_assignment_or_404(db, assignment_id, current_user)
    attempts_by_student = {a.student_id: a for a in assignment.attempts}
    students = (
        db.query(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .filter(Enrollment.course_id == assignment.course_id)
        .order_by(User.email)
        .all()
    )
    attempts = []
    for student in students:
        attempt = attempts_by_student.get(student.id)
        attempts.append(
            StudentAttempt(
                student_name=_display_name(student.email),
                student_email=student.email,
                status=attempt.status if attempt else "not_started",
                score=float(attempt.score) if attempt and attempt.score is not None else None,
                submitted_at=attempt.submitted_at if attempt else None,
                late=_late(assignment, attempt.submitted_at if attempt else None),
            )
        )
    order = {"completed": 0, "in_progress": 1, "not_started": 2}
    attempts.sort(key=lambda a: (order[a.status], -(a.score or 0), a.student_email))
    return AssignmentDetail(
        **_instructor_summary(db, assignment).model_dump(),
        questions=[
            AssignmentQuestion(
                id=q["id"],
                concept_title=q["concept_title"],
                prompt=q["prompt"],
                options=q["options"],
                answer_index=q["answer_index"],
                explanation=q["explanation"],
            )
            for q in assignment.questions
        ],
        attempts=attempts,
    )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> None:
    db.delete(_owned_assignment_or_404(db, assignment_id, current_user))
    db.commit()


@router.post("/{assignment_id}/start", response_model=AssessmentDetail)
def start_assignment(
    assignment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> AssessmentDetail:
    """Open the student's attempt, creating it the first time."""
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    get_accessible_course_or_404(db, assignment.course_id, current_user)

    attempt = (
        db.query(Assessment)
        .filter(Assessment.assignment_id == assignment.id, Assessment.student_id == current_user.id)
        .first()
    )
    if attempt is None:
        attempt = Assessment(
            student_id=current_user.id,
            course_id=assignment.course_id,
            assignment_id=assignment.id,
            mode="assigned",
            title=assignment.title,
            question_count=assignment.question_count,
            questions=assignment.questions,
            status="in_progress",
            created_at=datetime.now(timezone.utc),
        )
        db.add(attempt)
        try:
            db.commit()
        except IntegrityError:
            # A double click raced us to it; use the attempt that won.
            db.rollback()
            attempt = (
                db.query(Assessment)
                .filter(Assessment.assignment_id == assignment.id, Assessment.student_id == current_user.id)
                .one()
            )
        db.refresh(attempt)
    return paper_detail(attempt)
