import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.models.concept import Concept
from app.models.course import Course
from app.models.knowledge_profile import StudentKnowledgeProfile
from app.models.user import User
from app.schemas.course import CourseCreateRequest, CourseResponse, CourseSummaryResponse

router = APIRouter(prefix="/courses", tags=["courses"])

_MASTERY_GAP_THRESHOLD = 0.6


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    existing = (
        db.query(Course)
        .filter(Course.user_id == current_user.id, Course.code == payload.code)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a course with code '{payload.code}'.",
        )

    course = Course(
        title=payload.title,
        code=payload.code,
        description=payload.description,
        user_id=current_user.id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("", response_model=list[CourseSummaryResponse])
def list_courses(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[CourseSummaryResponse]:
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()

    summaries: list[CourseSummaryResponse] = []
    for course in courses:
        total_concepts = (
            db.query(func.count(Concept.id)).filter(Concept.course_id == course.id).scalar() or 0
        )

        mastery_row = (
            db.query(func.avg(StudentKnowledgeProfile.mastery_score))
            .join(Concept, Concept.id == StudentKnowledgeProfile.concept_id)
            .filter(Concept.course_id == course.id, StudentKnowledgeProfile.user_id == current_user.id)
            .scalar()
        )
        overall_mastery = float(mastery_row) if mastery_row is not None else 0.0

        weak_concept_count = (
            db.query(func.count(StudentKnowledgeProfile.id))
            .join(Concept, Concept.id == StudentKnowledgeProfile.concept_id)
            .filter(
                Concept.course_id == course.id,
                StudentKnowledgeProfile.user_id == current_user.id,
                StudentKnowledgeProfile.mastery_score < _MASTERY_GAP_THRESHOLD,
            )
            .scalar()
            or 0
        )

        summaries.append(
            CourseSummaryResponse(
                id=course.id,
                title=course.title,
                code=course.code,
                description=course.description,
                user_id=course.user_id,
                created_at=course.created_at,
                overall_mastery=round(overall_mastery, 2),
                total_concepts=total_concepts,
                weak_concept_count=weak_concept_count,
            )
        )
    return summaries


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    course = get_owned_course_or_404(db, course_id, current_user.id)
    return course


def get_owned_course_or_404(db: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> Course:
    course = (
        db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course
