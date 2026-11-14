"""Examination relevance from previous-year papers (Eq. 4).

Each PYQ file is split into questions; each question's marks go to the
concepts it names (split evenly when it names several), or, when it names
none, to the most similar concept by embedding when the similarity is high
enough. M_c is the total; e_c = M_c / max M is computed at planning time.
"""

import logging
import re
import statistics
from pathlib import Path

import numpy as np
from sqlalchemy.orm import Session

from app.models.concept import Concept
from app.models.course import Course
from app.models.resource import Resource
from app.services.ingestion import parse_resource
from app.services.text_match import embed, find_mentions, normalise, title_variants

logger = logging.getLogger(__name__)

SEMANTIC_MIN_SIMILARITY = 0.35

# A question starts at "Q1", "Q.1", "1.", "1)" or "(a)"/"a)" at the start of a line.
_QUESTION_START = re.compile(r"^\s*(?:Q\.?\s*\d+[a-z]?\b[.):]?|\d{1,2}\s*[.)]\s|\(?[a-h]\)\s)", re.IGNORECASE | re.MULTILINE)
_MARKS = re.compile(
    r"[(\[]\s*(\d{1,2})\s*(?:marks?|m)?\s*[)\]]|\b(\d{1,2})\s*marks?\b|\[\s*(\d{1,2})\s*\]", re.IGNORECASE
)


def split_questions(text: str) -> list[tuple[str, float | None]]:
    """(question text, marks or None) for every question found."""
    starts = [m.start() for m in _QUESTION_START.finditer(text)]
    if not starts:
        return []
    segments = [text[s:e] for s, e in zip(starts, starts[1:] + [len(text)])]
    questions = []
    for segment in segments:
        segment = segment.strip()
        if len(segment) < 12:
            continue
        # PDF text wraps lines anywhere ("(10" then "marks)"), so match on collapsed whitespace.
        flat = " ".join(segment.split())
        matches = list(_MARKS.finditer(flat))
        marks = float(next(g for g in matches[-1].groups() if g)) if matches else None
        questions.append((segment, marks))
    return questions


def compute_exam_marks(db: Session, course: Course, concepts: list[Concept]) -> dict:
    """Recompute M_c for every concept of the course. Returns a summary."""
    papers = (
        db.query(Resource)
        .filter(Resource.course_id == course.id, Resource.resource_type == "pyq", Resource.processing_status == "indexed")
        .all()
    )
    questions: list[tuple[str, float | None]] = []
    for paper in papers:
        if "://" in paper.storage_url or not Path(paper.storage_url).is_file():
            continue
        try:
            text = "\n".join(b.raw_text for b in parse_resource(paper.storage_url, paper.file_type))
        except Exception:
            logger.warning("Couldn't parse PYQ %s", paper.id, exc_info=True)
            continue
        questions.extend(split_questions(text))

    for concept in concepts:
        concept.exam_marks = 0.0
    if not questions or not concepts:
        db.commit()
        return {"pyq_questions": len(questions), "pyq_mapped": 0}

    known = [m for _, m in questions if m is not None]
    default_marks = statistics.median(known) if known else 1.0
    variants = {c.id: title_variants(c.title) for c in concepts}
    concept_vectors = embed([c.title for c in concepts])

    unnamed: list[tuple[int, float]] = []
    mapped = 0
    for index, (text, marks) in enumerate(questions):
        marks = marks if marks is not None else default_marks
        found = find_mentions(normalise(text), variants)
        named = [c for c in concepts if c.id in found]
        if named:
            for concept in named:
                concept.exam_marks += marks / len(named)
            mapped += 1
        else:
            unnamed.append((index, marks))

    if unnamed:
        vectors = embed([questions[i][0][:1000] for i, _ in unnamed])
        similarity = vectors @ concept_vectors.T
        for row, (_, marks) in enumerate(unnamed):
            best = int(np.argmax(similarity[row]))
            if similarity[row, best] >= SEMANTIC_MIN_SIMILARITY:
                concepts[best].exam_marks += marks
                mapped += 1

    for concept in concepts:
        concept.exam_marks = round(concept.exam_marks, 2)
    db.commit()
    return {"pyq_questions": len(questions), "pyq_mapped": mapped}
