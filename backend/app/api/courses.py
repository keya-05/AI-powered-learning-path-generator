import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.codes import new_join_code, normalise_code
from app.db.postgres import get_db
from app.models.concept import Concept
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.knowledge_profile import StudentKnowledgeProfile
from app.models.user import User
from app.schemas.course import (
    ConceptResponse,
    CourseCreateRequest,
    CourseJoinRequest,
    CourseResponse,
    CourseSummaryResponse,
    JoinCodeResponse,
)

router = APIRouter(prefix="/courses", tags=["courses"])

_MASTERY_GAP_THRESHOLD = 0.6

_UNIT_PREFIX = re.compile(r"^\s*unit\s*(\d+)\s*[:.\-–]\s*", re.IGNORECASE)


def _parse_topics(lines: list[str]) -> list[tuple[str, int, int]]:
    """"Unit 2: Hashing" -> ("Hashing", 2, position); a bare title keeps the previous unit (1 at first).

    `position` is the topic's order within its unit, used by the syllabus-order signal.
    """
    topics: list[tuple[str, int, int]] = []
    per_unit: dict[int, int] = {}
    seen: set[str] = set()
    unit = 1
    for line in lines:
        match = _UNIT_PREFIX.match(line)
        if match:
            unit = max(1, int(match.group(1)))
            line = line[match.end():]
        title = line.strip()[:255]
        if title and title.lower() not in seen:
            seen.add(title.lower())
            topics.append((title, unit, per_unit.get(unit, 0)))
            per_unit[unit] = per_unit.get(unit, 0) + 1
    return topics


def _subject_code(title: str, taken: set[str]) -> str:
    initials = "".join(word[0] for word in re.findall(r"[A-Za-z0-9]+", title)).upper()[:6] or "SUBJ"
    code, n = f"MY-{initials}", 2
    while code in taken:
        code, n = f"MY-{initials}{n}", n + 1
    return code


@router.post("", response_model=CourseSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor", "student")),
) -> CourseSummaryResponse:
    """Instructors create courses for a class; students create their own private subjects."""
    is_instructor = current_user.role == "instructor"
    taken = {code for (code,) in db.query(Course.code).filter(Course.user_id == current_user.id)}
    code = (payload.code or "").strip()
    if not code:
        if is_instructor:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A course code is required."
            )
        code = _subject_code(payload.title, taken)
    if code in taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a course with code '{code}'.",
        )

    course = Course(
        title=payload.title.strip(),
        code=code,
        description=payload.description,
        user_id=current_user.id,
        # A student's own subject has no join code and belongs to no school: it's private.
        join_code=new_join_code(db, Course.join_code) if is_instructor else None,
        organization_id=current_user.organization_id if is_instructor else None,
    )
    db.add(course)
    db.flush()
    for title, unit, position in _parse_topics(payload.topics):
        db.add(Concept(course_id=course.id, title=title, unit_number=unit, position=position))
    if not is_instructor:
        # A student studies their own subject like any enrolled course.
        db.add(Enrollment(course_id=course.id, student_id=current_user.id))
    db.commit()
    db.refresh(course)
    return CourseSummaryResponse(
        id=course.id,
        title=course.title,
        code=course.code,
        description=course.description,
        user_id=course.user_id,
        created_at=course.created_at,
        is_personal=course.is_personal,
        overall_mastery=0.0,
        total_concepts=len(course.concepts),
        weak_concept_count=0,
        enrolled_count=0 if is_instructor else None,
        join_code=course.join_code if is_instructor else None,
    )


@router.get("", response_model=list[CourseSummaryResponse])
def list_courses(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[CourseSummaryResponse]:
    if current_user.role == "instructor":
        courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    else:
        courses = (
            db.query(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .filter(Enrollment.student_id == current_user.id)
            .all()
        )

    summaries: list[CourseSummaryResponse] = []
    for course in courses:
        total_concepts = (
            db.query(func.count(Concept.id)).filter(Concept.course_id == course.id).scalar() or 0
        )

        if current_user.role == "instructor":
            enrolled_count = (
                db.query(func.count(Enrollment.id))
                .filter(Enrollment.course_id == course.id)
                .scalar()
                or 0
            )
            overall_mastery = 0.0
            weak_concept_count = 0
        else:
            enrolled_count = None
            mastery_row = (
                db.query(func.avg(StudentKnowledgeProfile.mastery_score))
                .join(Concept, Concept.id == StudentKnowledgeProfile.concept_id)
                .filter(
                    Concept.course_id == course.id,
                    StudentKnowledgeProfile.user_id == current_user.id,
                )
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
                is_personal=course.is_personal,
                join_code=course.join_code if current_user.role == "instructor" else None,
                overall_mastery=round(overall_mastery, 2),
                total_concepts=total_concepts,
                weak_concept_count=weak_concept_count,
                enrolled_count=enrolled_count,
            )
        )
    return summaries


@router.get("/available", response_model=list[CourseResponse])
def list_available_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> list[CourseResponse]:
    """The student's own school's courses they haven't joined yet.

    Students outside a school see none: they join with a code from a teacher,
    or study their own subjects.
    """
    if current_user.organization_id is None:
        return []
    enrolled_course_ids = db.query(Enrollment.course_id).filter(
        Enrollment.student_id == current_user.id
    )
    return (
        db.query(Course)
        .join(User, User.id == Course.user_id)
        .filter(
            ~Course.id.in_(enrolled_course_ids),
            User.role == "instructor",
            Course.organization_id == current_user.organization_id,
        )
        .order_by(Course.code)
        .all()
    )


@router.post("/join", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def join_course_by_code(
    payload: CourseJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> CourseResponse:
    """Enrol with a code the teacher shared, whether or not the student is in that school."""
    course = db.query(Course).filter(Course.join_code == normalise_code(payload.code)).first()
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No course matches that code. Check it with your teacher.",
        )
    return _enroll(db, course, current_user)


@router.post("/{course_id}/join-code", response_model=JoinCodeResponse)
def regenerate_join_code(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> JoinCodeResponse:
    """Issue a new code, e.g. after the old one leaked. Enrolled students stay enrolled."""
    course = get_owned_course_or_404(db, course_id, current_user.id)
    course.join_code = new_join_code(db, Course.join_code)
    db.commit()
    return JoinCodeResponse(join_code=course.join_code)


@router.post("/{course_id}/enroll", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def enroll_in_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> CourseResponse:
    """Enrol from the school catalog: only courses in the student's own school."""
    course = db.get(Course, course_id)
    if (
        course is None
        or course.is_personal
        or current_user.organization_id is None
        or course.organization_id != current_user.organization_id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return _enroll(db, course, current_user)


def _enroll(db: Session, course: Course, student: User) -> Course:
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.course_id == course.id, Enrollment.student_id == student.id)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=f"You're already enrolled in {course.code}."
        )
    db.add(Enrollment(course_id=course.id, student_id=student.id))
    db.commit()
    return course


@router.get("/{course_id}/concepts", response_model=list[ConceptResponse])
def list_concepts(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConceptResponse]:
    get_accessible_course_or_404(db, course_id, current_user)
    return (
        db.query(Concept)
        .filter(Concept.course_id == course_id)
        .order_by(Concept.unit_number, Concept.position, Concept.title)
        .all()
    )


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    course = get_accessible_course_or_404(db, course_id, current_user)
    return course


def get_owned_course_or_404(db: Session, course_id: uuid.UUID, user_id: uuid.UUID) -> Course:
    course = (
        db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course


def get_accessible_course_or_404(db: Session, course_id: uuid.UUID, user: User) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if user.role == "instructor":
        if course.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    else:
        enrolled = (
            db.query(Enrollment)
            .filter(Enrollment.course_id == course_id, Enrollment.student_id == user.id)
            .first()
        )
        if enrolled is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    return course
