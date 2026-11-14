"""Build and read a course's curriculum graph.

`rebuild_course_graph` runs the graph branch of Fig. 1 end to end:
concept extraction from the syllabus -> concept-passage links -> prerequisite
edges (Eq. 1, cycle removal) -> examination weights (Eq. 4), all stored in PostgreSQL.
It runs as a background task after every ingestion and on instructor request.
"""

import logging
import threading
import uuid
from collections import defaultdict
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.concept import Concept
from app.models.course import Course
from app.models.graph import ConceptChunk, ConceptPrerequisite, CourseGraphStatus, CourseUnit
from app.services import concept_extraction, exam_weights, prerequisites

logger = logging.getLogger(__name__)

_locks: dict[uuid.UUID, threading.Lock] = defaultdict(threading.Lock)


def _set_status(db: Session, course_id: uuid.UUID, state: str, details: dict | None = None) -> None:
    row = db.get(CourseGraphStatus, course_id)
    if row is None:
        row = CourseGraphStatus(course_id=course_id)
        db.add(row)
    row.state = state
    if details is not None:
        row.details = details
    db.commit()


def rebuild_course_graph(db: Session, course: Course, *, extract: bool = True, use_llm: bool = True) -> dict:
    lock = _locks[course.id]
    with lock:
        _set_status(db, course.id, "building")
        details: dict = {}
        try:
            if extract:
                details["extraction"] = concept_extraction.extract_course_concepts(db, course)
            concepts = (
                db.query(Concept)
                .filter(Concept.course_id == course.id)
                .order_by(Concept.unit_number, Concept.position, Concept.title)
                .all()
            )
            passages = prerequisites.course_passages(course.id)
            details["concepts"] = len(concepts)
            details["passages"] = len(passages)
            details["links"] = prerequisites.link_concepts(db, course, concepts, passages)
            details.update(prerequisites.rebuild_edges(db, course, concepts, passages, use_llm=use_llm))
            details.update(exam_weights.compute_exam_marks(db, course, concepts))
            _set_status(db, course.id, "ready", details)
        except Exception as error:
            db.rollback()
            logger.exception("Graph build failed for course %s", course.id)
            details["error"] = f"{type(error).__name__}: {error}"[:300]
            _set_status(db, course.id, "failed", details)
        return details


def rebuild_in_background(course_id: uuid.UUID, extract: bool = True) -> None:
    from app.db.postgres import SessionLocal

    db = SessionLocal()
    try:
        course = db.get(Course, course_id)
        if course is not None:
            rebuild_course_graph(db, course, extract=extract)
    finally:
        db.close()


# --------------------------------------------------------------------------
# Reading the graph
# --------------------------------------------------------------------------


@dataclass
class CourseGraph:
    concepts: dict[uuid.UUID, Concept]
    # concept -> its direct prerequisites, and the reverse
    prerequisites: dict[uuid.UUID, set[uuid.UUID]] = field(default_factory=lambda: defaultdict(set))
    dependants: dict[uuid.UUID, set[uuid.UUID]] = field(default_factory=lambda: defaultdict(set))
    edges: list[ConceptPrerequisite] = field(default_factory=list)
    unit_hours: dict[int, float] = field(default_factory=dict)
    links: dict[uuid.UUID, list[ConceptChunk]] = field(default_factory=lambda: defaultdict(list))


def load_graph(db: Session, course_id: uuid.UUID, *, with_links: bool = False) -> CourseGraph:
    concepts = {
        c.id: c
        for c in db.query(Concept)
        .filter(Concept.course_id == course_id)
        .order_by(Concept.unit_number, Concept.position, Concept.title)
    }
    graph = CourseGraph(concepts=concepts)
    for edge in db.query(ConceptPrerequisite).filter(
        ConceptPrerequisite.course_id == course_id, ConceptPrerequisite.status == "active"
    ):
        if edge.concept_id in concepts and edge.prerequisite_id in concepts:
            graph.prerequisites[edge.concept_id].add(edge.prerequisite_id)
            graph.dependants[edge.prerequisite_id].add(edge.concept_id)
            graph.edges.append(edge)
    graph.unit_hours = {
        u.number: u.lecture_hours
        for u in db.query(CourseUnit).filter(CourseUnit.course_id == course_id)
        if u.lecture_hours
    }
    if with_links:
        for link in db.query(ConceptChunk).filter(ConceptChunk.course_id == course_id).order_by(ConceptChunk.score.desc()):
            graph.links[link.concept_id].append(link)
    return graph
