"""Curriculum graph: read it, rebuild it, and let the course owner review edges."""

import uuid
from collections import defaultdict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.courses import get_accessible_course_or_404, get_owned_course_or_404
from app.api.deps import get_current_user
from app.db.postgres import get_db
from app.models.concept import Concept
from app.models.graph import ConceptChunk, ConceptPrerequisite, CourseGraphStatus, CourseUnit
from app.models.user import User
from app.schemas.graph import (
    CourseGraphResponse,
    EdgeCreateRequest,
    EdgeUpdateRequest,
    GraphConcept,
    GraphEdge,
    GraphStatus,
    GraphUnit,
)
from app.services.course_graph import rebuild_in_background
from app.services.prerequisites import find_cycle

router = APIRouter(prefix="/courses", tags=["graph"])


def _edge_view(edge: ConceptPrerequisite) -> GraphEdge:
    return GraphEdge(
        id=edge.id,
        concept_id=edge.concept_id,
        prerequisite_id=edge.prerequisite_id,
        confidence=round(edge.confidence, 3),
        explicit=edge.explicit,
        order=edge.order,
        cooccurrence=round(edge.cooccurrence, 3),
        evidence=edge.evidence,
        source=edge.source,
        status=edge.status,
    )


@router.get("/{course_id}/graph", response_model=CourseGraphResponse)
def get_course_graph(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseGraphResponse:
    """Units, concepts and prerequisite edges. Only the course owner sees rejected and cycle edges."""
    course = get_accessible_course_or_404(db, course_id, current_user)
    is_owner = course.user_id == current_user.id

    counts = dict(
        db.query(ConceptChunk.concept_id, func.count(ConceptChunk.id))
        .filter(ConceptChunk.course_id == course_id)
        .group_by(ConceptChunk.concept_id)
        .all()
    )
    concepts = (
        db.query(Concept)
        .filter(Concept.course_id == course_id)
        .order_by(Concept.unit_number, Concept.position, Concept.title)
        .all()
    )
    edge_query = db.query(ConceptPrerequisite).filter(ConceptPrerequisite.course_id == course_id)
    if not is_owner:
        edge_query = edge_query.filter(ConceptPrerequisite.status == "active")
    units = {u.number: u for u in db.query(CourseUnit).filter(CourseUnit.course_id == course_id)}
    for number in {c.unit_number for c in concepts} - set(units):
        units[number] = CourseUnit(number=number)
    graph_status = db.get(CourseGraphStatus, course_id)

    return CourseGraphResponse(
        course_id=course_id,
        status=GraphStatus(
            state=graph_status.state if graph_status else "idle",
            details=graph_status.details if graph_status and is_owner else None,
            updated_at=graph_status.updated_at if graph_status else None,
        ),
        units=[GraphUnit(number=n, title=u.title, lecture_hours=u.lecture_hours) for n, u in sorted(units.items())],
        concepts=[
            GraphConcept(
                id=c.id,
                title=c.title,
                unit_number=c.unit_number,
                position=c.position,
                source=c.source,
                exam_marks=c.exam_marks,
                passage_count=counts.get(c.id, 0),
            )
            for c in concepts
        ],
        edges=[_edge_view(e) for e in edge_query.order_by(ConceptPrerequisite.confidence.desc())],
    )


@router.post("/{course_id}/graph/rebuild", status_code=status.HTTP_202_ACCEPTED)
def rebuild_graph(
    course_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Re-extract concepts and recompute links, edges and exam weights in the background."""
    get_owned_course_or_404(db, course_id, current_user.id)
    row = db.get(CourseGraphStatus, course_id) or CourseGraphStatus(course_id=course_id)
    row.state = "queued"
    db.add(row)
    db.commit()
    background_tasks.add_task(rebuild_in_background, course_id, True)
    return {"state": "queued"}


def _would_cycle(db: Session, course_id: uuid.UUID, concept_id: uuid.UUID, prerequisite_id: uuid.UUID) -> bool:
    edges: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
    nodes = {concept_id, prerequisite_id}
    for a, b in db.query(ConceptPrerequisite.concept_id, ConceptPrerequisite.prerequisite_id).filter(
        ConceptPrerequisite.course_id == course_id, ConceptPrerequisite.status == "active"
    ):
        if (a, b) != (concept_id, prerequisite_id):
            edges[a].add(b)
            nodes.update((a, b))
    edges[concept_id].add(prerequisite_id)
    return find_cycle(nodes, edges) is not None


def _cycle_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="That link would create a loop of prerequisites. Remove one of the existing links first.",
    )


@router.post("/{course_id}/graph/edges", response_model=GraphEdge, status_code=status.HTTP_201_CREATED)
def add_edge(
    course_id: uuid.UUID,
    payload: EdgeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GraphEdge:
    get_owned_course_or_404(db, course_id, current_user.id)
    if payload.concept_id == payload.prerequisite_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A concept can't require itself.")
    found = db.query(func.count(Concept.id)).filter(
        Concept.course_id == course_id, Concept.id.in_([payload.concept_id, payload.prerequisite_id])
    ).scalar()
    if found != 2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concept not found in this course.")
    if _would_cycle(db, course_id, payload.concept_id, payload.prerequisite_id):
        raise _cycle_error()

    edge = (
        db.query(ConceptPrerequisite)
        .filter(
            ConceptPrerequisite.concept_id == payload.concept_id,
            ConceptPrerequisite.prerequisite_id == payload.prerequisite_id,
        )
        .first()
    )
    if edge is None:
        edge = ConceptPrerequisite(
            course_id=course_id, concept_id=payload.concept_id, prerequisite_id=payload.prerequisite_id,
            explicit=0.0, order=0.0, cooccurrence=0.0,
        )
        db.add(edge)
    edge.source, edge.status, edge.confidence = "instructor", "active", 1.0
    db.commit()
    db.refresh(edge)
    return _edge_view(edge)


def _owned_edge(db: Session, course_id: uuid.UUID, edge_id: uuid.UUID, user: User) -> ConceptPrerequisite:
    get_owned_course_or_404(db, course_id, user.id)
    edge = (
        db.query(ConceptPrerequisite)
        .filter(ConceptPrerequisite.id == edge_id, ConceptPrerequisite.course_id == course_id)
        .first()
    )
    if edge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found.")
    return edge


@router.patch("/{course_id}/graph/edges/{edge_id}", response_model=GraphEdge)
def review_edge(
    course_id: uuid.UUID,
    edge_id: uuid.UUID,
    payload: EdgeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GraphEdge:
    """Approve (locks the edge against rebuilds) or reject (keeps rebuilds from re-adding it)."""
    edge = _owned_edge(db, course_id, edge_id, current_user)
    if payload.status == "active":
        if edge.status != "active" and _would_cycle(db, course_id, edge.concept_id, edge.prerequisite_id):
            raise _cycle_error()
        edge.status, edge.source = "active", "instructor"
    else:
        edge.status = "rejected"
    db.commit()
    db.refresh(edge)
    return _edge_view(edge)


@router.delete("/{course_id}/graph/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(
    course_id: uuid.UUID,
    edge_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Instructor edges are removed; automatic ones are marked rejected so rebuilds don't bring them back."""
    edge = _owned_edge(db, course_id, edge_id, current_user)
    if edge.source == "instructor" and edge.cooccurrence == 0 and edge.order == 0 and edge.explicit == 0:
        db.delete(edge)
    else:
        edge.status = "rejected"
    db.commit()
