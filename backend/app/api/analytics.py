import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.courses import get_accessible_course_or_404, get_owned_course_or_404
from app.api.deps import require_role
from app.db.postgres import get_db
from app.models.concept import Concept
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.knowledge_profile import StudentKnowledgeProfile
from app.models.resource import Resource
from app.models.user import User
from app.schemas.analytics import (
    ConceptStat,
    InstructorOverview,
    InstructorTotals,
    ResourceSummary,
    StudentConcept,
    StudentOverview,
    StudentStanding,
    UnitMastery,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

_MASTERY_GAP_THRESHOLD = 0.6


def _display_name(email: str) -> str:
    local_part = email.split("@")[0]
    return " ".join(word.capitalize() for word in local_part.replace("_", ".").split(".") if word)


def _mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def _unit_mastery(concepts: list[Concept], scores_by_concept: dict[uuid.UUID, list[float]]) -> list[UnitMastery]:
    concepts_by_unit: dict[int, list[Concept]] = defaultdict(list)
    for concept in concepts:
        concepts_by_unit[concept.unit_number].append(concept)

    units: list[UnitMastery] = []
    for unit_number in sorted(concepts_by_unit):
        unit_scores = [
            score
            for concept in concepts_by_unit[unit_number]
            for score in scores_by_concept.get(concept.id, [])
        ]
        units.append(
            UnitMastery(
                unit_number=unit_number,
                label=f"Unit {unit_number}",
                mastery=_mean(unit_scores) or 0.0,
                concept_count=len(concepts_by_unit[unit_number]),
            )
        )
    return units


@router.get("/instructor", response_model=InstructorOverview)
def instructor_overview(
    course_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> InstructorOverview:
    if course_id is not None:
        courses = [get_owned_course_or_404(db, course_id, current_user.id)]
    else:
        courses = db.query(Course).filter(Course.user_id == current_user.id).all()

    course_ids = [course.id for course in courses]
    course_codes = {course.id: course.code for course in courses}

    concepts = (
        db.query(Concept)
        .filter(Concept.course_id.in_(course_ids))
        .order_by(Concept.unit_number, Concept.title)
        .all()
    )
    concept_by_id = {concept.id: concept for concept in concepts}

    student_ids = {
        student_id
        for (student_id,) in db.query(Enrollment.student_id)
        .filter(Enrollment.course_id.in_(course_ids))
        .distinct()
    }
    students = db.query(User).filter(User.id.in_(student_ids)).all() if student_ids else []

    profiles = (
        db.query(StudentKnowledgeProfile)
        .filter(
            StudentKnowledgeProfile.concept_id.in_(concept_by_id.keys()),
            StudentKnowledgeProfile.user_id.in_(student_ids),
        )
        .all()
        if concept_by_id and student_ids
        else []
    )

    scores_by_concept: dict[uuid.UUID, list[float]] = defaultdict(list)
    profiles_by_student: dict[uuid.UUID, list[StudentKnowledgeProfile]] = defaultdict(list)
    for profile in profiles:
        scores_by_concept[profile.concept_id].append(float(profile.mastery_score))
        profiles_by_student[profile.user_id].append(profile)

    standings: list[StudentStanding] = []
    for student in students:
        student_profiles = profiles_by_student.get(student.id, [])
        weakest = min(student_profiles, key=lambda p: p.mastery_score, default=None)
        weakest_concept = concept_by_id[weakest.concept_id] if weakest else None
        standings.append(
            StudentStanding(
                student_id=student.id,
                email=student.email,
                display_name=_display_name(student.email),
                mastery=_mean([float(p.mastery_score) for p in student_profiles]),
                weak_concept_count=sum(
                    1 for p in student_profiles if p.mastery_score < _MASTERY_GAP_THRESHOLD
                ),
                weakest_concept=weakest_concept.title if weakest_concept else None,
                weakest_unit=weakest_concept.unit_number if weakest_concept else None,
            )
        )
    standings.sort(key=lambda s: (s.mastery is None, s.mastery if s.mastery is not None else 0))

    concept_stats: list[ConceptStat] = []
    for concept in concepts:
        scores = scores_by_concept.get(concept.id, [])
        struggling = sum(1 for score in scores if score < _MASTERY_GAP_THRESHOLD)
        concept_stats.append(
            ConceptStat(
                concept_id=concept.id,
                course_id=concept.course_id,
                title=concept.title,
                unit_number=concept.unit_number,
                average_mastery=_mean(scores),
                struggling_pct=round(struggling / len(scores), 2) if scores else 0.0,
                students_assessed=len(scores),
                students_struggling=struggling,
            )
        )

    resources = (
        db.query(Resource)
        .filter(Resource.course_id.in_(course_ids))
        .order_by(Resource.created_at.desc())
        .all()
    )

    return InstructorOverview(
        totals=InstructorTotals(
            courses=len(courses),
            students=len(students),
            concepts=len(concepts),
            resources=len(resources),
            average_mastery=_mean([float(p.mastery_score) for p in profiles]),
        ),
        unit_mastery=_unit_mastery(concepts, scores_by_concept),
        students=standings,
        concepts=concept_stats,
        resources=[
            ResourceSummary(
                id=resource.id,
                course_id=resource.course_id,
                course_code=course_codes[resource.course_id],
                file_name=resource.file_name,
                file_type=resource.file_type,
                resource_type=resource.resource_type,
                processing_status=resource.processing_status,
                created_at=resource.created_at,
            )
            for resource in resources
        ],
    )


@router.get("/student", response_model=StudentOverview)
def student_overview(
    course_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> StudentOverview:
    if course_id is not None:
        courses = [get_accessible_course_or_404(db, course_id, current_user)]
    else:
        courses = (
            db.query(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .filter(Enrollment.student_id == current_user.id)
            .all()
        )
    course_codes = {course.id: course.code for course in courses}

    concepts = (
        db.query(Concept)
        .filter(Concept.course_id.in_(course_codes.keys()))
        .order_by(Concept.unit_number, Concept.title)
        .all()
    )
    profiles = (
        db.query(StudentKnowledgeProfile)
        .filter(
            StudentKnowledgeProfile.user_id == current_user.id,
            StudentKnowledgeProfile.concept_id.in_([concept.id for concept in concepts]),
        )
        .all()
        if concepts
        else []
    )
    score_by_concept = {profile.concept_id: float(profile.mastery_score) for profile in profiles}

    student_concepts: list[StudentConcept] = []
    for concept in concepts:
        mastery = score_by_concept.get(concept.id)
        if mastery is None:
            status = "not_assessed"
        elif mastery < _MASTERY_GAP_THRESHOLD:
            status = "gap"
        else:
            status = "mastered"
        student_concepts.append(
            StudentConcept(
                concept_id=concept.id,
                course_id=concept.course_id,
                course_code=course_codes[concept.course_id],
                title=concept.title,
                unit_number=concept.unit_number,
                mastery=mastery,
                status=status,
            )
        )

    gaps = [concept for concept in student_concepts if concept.status == "gap"]

    return StudentOverview(
        average_mastery=_mean(list(score_by_concept.values())),
        concepts_assessed=len(score_by_concept),
        concepts_total=len(concepts),
        gap_count=len(gaps),
        unit_mastery=_unit_mastery(
            concepts, {concept_id: [score] for concept_id, score in score_by_concept.items()}
        ),
        concepts=student_concepts,
        weakest_concept=min(gaps, key=lambda c: c.mastery, default=None),
    )
