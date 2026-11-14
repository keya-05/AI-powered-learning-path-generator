"""Hybrid graph-vector retrieval with reciprocal rank fusion (Sec. III-F, Eq. 2).

L_v: passages nearest to the question in the vector index.
L_g: passages linked (EXTRACTED_FROM) to the concept the question concerns,
     then to that concept's immediate prerequisites and dependants; within a
     graph distance, passages are ordered by similarity to the question.
RRF(x) = sum over lists containing x of 1 / (k_rrf + rank), k_rrf = 60; the
top eight fused passages are kept. Rank fusion avoids comparing cosine
similarity with graph distance directly.
"""

import logging
import uuid
from dataclasses import dataclass, field

import numpy as np
from sqlalchemy.orm import Session

from app.db.vector_store import get_chunk_collection
from app.models.concept import Concept
from app.models.graph import ConceptChunk, ConceptPrerequisite
from app.services.text_match import embed, find_mentions, normalise, title_variants

logger = logging.getLogger(__name__)

K_RRF = 60
TOP_FUSED = 8
VECTOR_CANDIDATES = 12
GRAPH_CANDIDATES = 12
FOCUS_CONCEPTS = 2
# Without a verbatim title in the question, the nearest concept must be at least this similar.
CONCEPT_MIN_SIMILARITY = 0.5


@dataclass
class Retrieved:
    chunk_id: str
    text: str
    metadata: dict
    score: float = 0.0
    ranks: dict[str, int] = field(default_factory=dict)


def _where(course_ids: list[str]) -> dict:
    return {"course_id": course_ids[0]} if len(course_ids) == 1 else {"course_id": {"$in": course_ids}}


def vector_search(question: str, course_ids: list[str], n: int = VECTOR_CANDIDATES) -> list[Retrieved]:
    try:
        result = get_chunk_collection().query(query_texts=[question], n_results=n, where=_where(course_ids))
    except Exception:
        logger.warning("Vector retrieval failed", exc_info=True)
        return []
    return [
        Retrieved(chunk_id=cid, text=doc or "", metadata=meta or {})
        for cid, doc, meta in zip(result["ids"][0], result["documents"][0], result["metadatas"][0])
    ]


def focus_concepts(db: Session, question: str, course_ids: list[uuid.UUID]) -> list[Concept]:
    """Concepts the question is about: titles it names, else the most similar title."""
    concepts = db.query(Concept).filter(Concept.course_id.in_(course_ids)).all()
    if not concepts:
        return []
    found = find_mentions(normalise(question), {c.id: title_variants(c.title) for c in concepts})
    named = [c for c in concepts if c.id in found]
    if named:
        # Longer titles are more specific ("binary search trees" over "trees").
        return sorted(named, key=lambda c: -len(c.title))[:FOCUS_CONCEPTS]
    vectors = embed([question] + [c.title for c in concepts])
    similarity = vectors[1:] @ vectors[0]
    best = int(np.argmax(similarity))
    return [concepts[best]] if similarity[best] >= CONCEPT_MIN_SIMILARITY else []


def graph_search(db: Session, question: str, course_ids: list[uuid.UUID], n: int = GRAPH_CANDIDATES) -> list[Retrieved]:
    focus = focus_concepts(db, question, course_ids)
    if not focus:
        return []
    focus_ids = {c.id for c in focus}
    neighbours: set[uuid.UUID] = set()
    for edge in db.query(ConceptPrerequisite).filter(
        ConceptPrerequisite.status == "active",
        (ConceptPrerequisite.concept_id.in_(focus_ids)) | (ConceptPrerequisite.prerequisite_id.in_(focus_ids)),
    ):
        neighbours.update((edge.concept_id, edge.prerequisite_id))
    neighbours -= focus_ids

    distance: dict[str, int] = {}
    for link in db.query(ConceptChunk).filter(ConceptChunk.concept_id.in_(focus_ids | neighbours)):
        d = 0 if link.concept_id in focus_ids else 1
        distance[link.chunk_id] = min(d, distance.get(link.chunk_id, d))
    if not distance:
        return []

    try:
        got = get_chunk_collection().get(ids=list(distance), include=["documents", "metadatas", "embeddings"])
    except Exception:
        logger.warning("Graph retrieval couldn't read passages", exc_info=True)
        return []
    q = embed([question])[0]
    items = []
    for cid, doc, meta, vector in zip(got["ids"], got["documents"], got["metadatas"], got["embeddings"]):
        v = np.asarray(vector, dtype=np.float32)
        similarity = float(v @ q / max(np.linalg.norm(v), 1e-9))
        items.append((distance[cid], -similarity, Retrieved(chunk_id=cid, text=doc or "", metadata=meta or {})))
    items.sort(key=lambda t: (t[0], t[1]))
    return [item for _, _, item in items[:n]]


def rrf_fuse(lists: dict[str, list[Retrieved]], k: int = K_RRF, top: int = TOP_FUSED) -> list[Retrieved]:
    fused: dict[str, Retrieved] = {}
    for name, ranked in lists.items():
        for rank, item in enumerate(ranked, start=1):
            entry = fused.setdefault(item.chunk_id, Retrieved(item.chunk_id, item.text, item.metadata))
            entry.score += 1.0 / (k + rank)
            entry.ranks[name] = rank
    return sorted(fused.values(), key=lambda r: (-r.score, min(r.ranks.values())))[:top]


def hybrid_retrieve(db: Session, question: str, course_ids: list[uuid.UUID], top: int = TOP_FUSED) -> list[Retrieved]:
    ids = [str(c) for c in course_ids]
    if not ids:
        return []
    vector = vector_search(question, ids)
    try:
        graph = graph_search(db, question, course_ids)
    except Exception:
        logger.warning("Graph branch failed; using vector results only", exc_info=True)
        graph = []
    fused = rrf_fuse({"vector": vector, "graph": graph}, top=top)
    # Second filter in application code, in case the store's filter misbehaves.
    return [r for r in fused if r.metadata.get("course_id") in ids]
