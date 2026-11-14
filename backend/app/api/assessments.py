import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.courses import get_accessible_course_or_404
from app.api.deps import require_role
from app.db.postgres import get_db
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.assessment import (
    AssessmentBlueprint,
    AssessmentCreateRequest,
    AssessmentDetail,
    AssessmentMode,
    AssessmentSubmitRequest,
    AssessmentSummary,
    BlueprintTopic,
    QuestionView,
    TopicResult,
)
from app.services.assessments import create_paper, plan_paper, submit_paper
from app.services.llm import AIUnavailable

router = APIRouter(prefix="/assessments", tags=["assessments"])


def summarize_paper(paper: Assessment) -> AssessmentSummary:
    return AssessmentSummary(
        id=paper.id,
        course_id=paper.course_id,
        course_code=paper.course.code,
        course_title=paper.course.title,
        mode=paper.mode,
        title=paper.title,
        question_count=paper.question_count,
        status=paper.status,
        score=float(paper.score) if paper.score is not None else None,
        created_at=paper.created_at,
        submitted_at=paper.submitted_at,
        assignment_id=paper.assignment_id,
        due_at=paper.assignment.due_at if paper.assignment else None,
        instructions=paper.assignment.instructions if paper.assignment else None,
    )


def paper_detail(paper: Assessment) -> AssessmentDetail:
    done = paper.status == "completed"
    answers = paper.answers or {}
    questions = [
        QuestionView(
            id=q["id"],
            concept_id=q["concept_id"],
            concept_title=q["concept_title"],
            prompt=q["prompt"],
            options=q["options"],
            # Answers stay on the server until the paper is submitted.
            answer_index=q["answer_index"] if done else None,
            explanation=q["explanation"] if done else None,
            chosen_index=answers.get(q["id"]) if done else None,
        )
        for q in paper.questions
    ]
    results = [TopicResult(**entry) for entry in (paper.topic_results or [])]
    return AssessmentDetail(**summarize_paper(paper).model_dump(), questions=questions, topic_results=results)


def _own_paper_or_404(db: Session, paper_id: uuid.UUID, user: User) -> Assessment:
    paper = (
        db.query(Assessment)
        .filter(Assessment.id == paper_id, Assessment.student_id == user.id)
        .first()
    )
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found.")
    return paper


@router.get("/blueprint", response_model=AssessmentBlueprint)
def blueprint(
    course_id: uuid.UUID,
    mode: AssessmentMode = "weak_focus",
    question_count: int = Query(default=10, ge=5, le=25),
    concept_ids: list[uuid.UUID] = Query(default_factory=list),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> AssessmentBlueprint:
    """Preview how a paper would be split across topics, before generating it."""
    course = get_accessible_course_or_404(db, course_id, current_user)
    topics = plan_paper(db, current_user, course, mode, question_count, concept_ids)
    return AssessmentBlueprint(
        course_id=course.id,
        mode=mode,
        question_count=question_count,
        topics=[
            BlueprintTopic(
                concept_id=t.concept.id,
                title=t.concept.title,
                unit_number=t.concept.unit_number,
                mastery=t.mastery,
                included=t.included,
                question_count=t.question_count,
            )
            for t in topics
        ],
    )


@router.get("", response_model=list[AssessmentSummary])
def list_assessments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> list[AssessmentSummary]:
    papers = (
        db.query(Assessment)
        # Assigned attempts are listed with their assignment instead.
        .filter(Assessment.student_id == current_user.id, Assessment.assignment_id.is_(None))
        .order_by(Assessment.created_at.desc())
        .all()
    )
    return [summarize_paper(paper) for paper in papers]


@router.post("", response_model=AssessmentDetail, status_code=status.HTTP_201_CREATED)
def generate_assessment(
    payload: AssessmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> AssessmentDetail:
    course = get_accessible_course_or_404(db, payload.course_id, current_user)
    try:
        paper = create_paper(
            db, current_user, course, payload.mode, payload.question_count, payload.concept_ids
        )
    except AIUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    return paper_detail(paper)


@router.get("/{paper_id}", response_model=AssessmentDetail)
def get_assessment(
    paper_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> AssessmentDetail:
    return paper_detail(_own_paper_or_404(db, paper_id, current_user))


@router.post("/{paper_id}/submit", response_model=AssessmentDetail)
def submit_assessment(
    paper_id: uuid.UUID,
    payload: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> AssessmentDetail:
    paper = _own_paper_or_404(db, paper_id, current_user)
    return paper_detail(submit_paper(db, paper, payload.answers))


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(
    paper_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student")),
) -> None:
    paper = _own_paper_or_404(db, paper_id, current_user)
    if paper.assignment_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Papers set by your instructor can't be deleted."
        )
    db.delete(paper)
    db.commit()
