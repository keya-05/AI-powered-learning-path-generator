"""
AI-Powered Personalized Learning Path Generator — Hybrid RAG Pipeline
Group BCC06 - Week 3 Sprint - Task 3.3

Architectural pseudo-implementation of:
  1. Hierarchical / hybrid document chunking (retains parent unit/topic metadata)
  2. Vector indexing with metadata filtering keys
  3. Hybrid retrieval (Cypher graph traversal + dense vector search) fused via
     Reciprocal Rank Fusion (RRF)

This module is intentionally dependency-light pseudo-code: concrete client
wiring (Chroma/FAISS client construction, Neo4j driver, embedding model) lives
in backend/app/db/*.py. Here we show the algorithmic shape end-to-end.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Literal

ResourceType = Literal["syllabus", "pyq", "notes", "ppt"]


# =============================================================================
# 1. Document Chunking Strategy — hierarchical, metadata-preserving
# =============================================================================

@dataclass
class ParentBlock:
    """A structural unit extracted by the parser (a slide, a syllabus section,
    a heading-delimited block of notes) BEFORE it is split for embedding."""
    unit_number: int
    unit_title: str
    raw_text: str
    page_or_slide_no: int


@dataclass
class Chunk:
    chunk_id: str
    course_id: str
    resource_id: str
    unit_number: int
    unit_title: str
    resource_type: ResourceType
    text: str
    token_count: int


def hierarchical_chunk(
    course_id: str,
    resource_id: str,
    resource_type: ResourceType,
    parent_blocks: list[ParentBlock],
    target_tokens: int = 400,
    overlap_tokens: int = 60,
) -> list[Chunk]:
    """
    Splits each ParentBlock into child chunks sized for embedding, while every
    child chunk retains its parent's unit_number/unit_title as metadata. This
    is what lets the vector index answer "give me chunks from Unit 3" without
    a separate join, and lets the graph branch attach REQUIRES_PREREQUISITE
    edges at the concept level while chunks stay attached at the unit level.
    """
    chunks: list[Chunk] = []
    for block in parent_blocks:
        for span in _sliding_window_split(block.raw_text, target_tokens, overlap_tokens):
            chunk_id = _deterministic_chunk_id(resource_id, block.page_or_slide_no, span.start)
            chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    course_id=course_id,
                    resource_id=resource_id,
                    unit_number=block.unit_number,
                    unit_title=block.unit_title,
                    resource_type=resource_type,
                    text=span.text,
                    token_count=span.token_count,
                )
            )
    return chunks


def _deterministic_chunk_id(resource_id: str, block_offset: int, span_start: int) -> str:
    """
    Deterministic (not random) chunk_id: the same input always produces the
    same UUID via uuid5. This is the join key shared between the Vector DB
    metadata and the Neo4j :ResourceChunk node created in the graph branch,
    so both indexes can be re-run idempotently without duplicating nodes.
    """
    namespace = uuid.UUID("6f9619ff-8b86-d011-b42d-00cf4fc964ff")
    return str(uuid.uuid5(namespace, f"{resource_id}:{block_offset}:{span_start}"))


@dataclass
class _Span:
    text: str
    start: int
    token_count: int


def _sliding_window_split(text: str, target_tokens: int, overlap_tokens: int) -> list[_Span]:
    """Token-aware sliding window split with overlap to preserve local context
    across chunk boundaries (e.g. a definition that spans two paragraphs)."""
    tokens = text.split()
    spans: list[_Span] = []
    step = max(target_tokens - overlap_tokens, 1)
    for start in range(0, len(tokens), step):
        window = tokens[start : start + target_tokens]
        if not window:
            break
        spans.append(_Span(text=" ".join(window), start=start, token_count=len(window)))
    return spans


# =============================================================================
# 2. Indexing — Vector DB with metadata filtering keys
# =============================================================================

class VectorIndexer:
    """Wraps a Chroma/FAISS collection. Every upsert carries the metadata
    keys (course_id, unit_id, resource_type) required for scoped retrieval."""

    def __init__(self, collection_client, embedding_model):
        self._collection = collection_client
        self._embed = embedding_model

    def index_chunks(self, chunks: list[Chunk]) -> None:
        embeddings = self._embed.embed_documents([c.text for c in chunks])
        self._collection.upsert(
            ids=[c.chunk_id for c in chunks],
            embeddings=embeddings,
            documents=[c.text for c in chunks],
            metadatas=[
                {
                    "course_id": c.course_id,
                    "unit_id": f"{c.course_id}:{c.unit_number}",
                    "resource_type": c.resource_type,
                    "resource_id": c.resource_id,
                }
                for c in chunks
            ],
        )


# =============================================================================
# 3. Retrieval & Grounding — Hybrid (Graph + Vector) fused via RRF
# =============================================================================

@dataclass
class RetrievedItem:
    chunk_id: str
    text: str = ""
    source: Literal["vector", "graph"] = "vector"
    rank: int = 0


@dataclass
class FusedResult:
    chunk_id: str
    text: str
    rrf_score: float
    sources: list[str] = field(default_factory=list)


class HybridRetriever:
    """
    Combines two retrieval signals for a student query about `concept_id`:

    A) Dense vector retrieval — semantically similar chunks, filtered by
       course_id/unit_id/resource_type metadata.
    B) Graph traversal — chunks EXTRACTED_FROM the concept itself and from its
       immediate prerequisite/dependent concepts (upstream/downstream context),
       via the Cypher queries defined in docs/GRAPH_SCHEMA.cypher.

    The two ranked lists are fused with Reciprocal Rank Fusion (RRF) rather
    than a naive score blend, since vector cosine-similarity and graph
    traversal distance are not on comparable scales.
    """

    def __init__(self, vector_collection, embedding_model, neo4j_session, rrf_k: int = 60):
        self._collection = vector_collection
        self._embed = embedding_model
        self._session = neo4j_session
        self._rrf_k = rrf_k

    def retrieve(
        self,
        query: str,
        course_id: str,
        concept_id: str,
        top_k: int = 8,
    ) -> list[FusedResult]:
        vector_hits = self._dense_vector_search(query, course_id, top_k=top_k)
        graph_hits = self._graph_context_search(concept_id, top_k=top_k)
        return self._reciprocal_rank_fusion([vector_hits, graph_hits], top_k=top_k)

    # -- A) Dense vector retrieval -------------------------------------------
    def _dense_vector_search(self, query: str, course_id: str, top_k: int) -> list[RetrievedItem]:
        query_embedding = self._embed.embed_query(query)
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"course_id": course_id},  # metadata filter
        )
        return [
            RetrievedItem(chunk_id=chunk_id, text=doc, source="vector", rank=rank)
            for rank, (chunk_id, doc) in enumerate(
                zip(results["ids"][0], results["documents"][0]), start=1
            )
        ]

    # -- B) Graph traversal for concept context ------------------------------
    def _graph_context_search(self, concept_id: str, top_k: int) -> list[RetrievedItem]:
        cypher = """
        MATCH (target:Concept {concept_id: $concept_id})
        OPTIONAL MATCH (target)-[:REQUIRES_PREREQUISITE*0..1]-(related:Concept)
        WITH collect(DISTINCT target) + collect(DISTINCT related) AS concepts
        UNWIND concepts AS co
        MATCH (co)-[:EXTRACTED_FROM]->(rc:ResourceChunk)
        RETURN DISTINCT rc.chunk_id AS chunk_id, rc.text_preview AS text
        LIMIT $top_k
        """
        records = self._session.run(cypher, concept_id=concept_id, top_k=top_k)
        return [
            RetrievedItem(chunk_id=r["chunk_id"], text=r["text"], source="graph", rank=rank)
            for rank, r in enumerate(records, start=1)
        ]

    # -- Fusion ---------------------------------------------------------------
    def _reciprocal_rank_fusion(
        self, ranked_lists: list[list[RetrievedItem]], top_k: int
    ) -> list[FusedResult]:
        """
        RRF score for a document d: sum over each ranked list L containing d
        of  1 / (k + rank_L(d)).  k dampens the influence of very high ranks
        from any single retriever, which matters here because the graph
        branch can return very few but highly-relevant items while the vector
        branch always returns exactly top_k.
        """
        scores: dict[str, float] = {}
        texts: dict[str, str] = {}
        sources: dict[str, list[str]] = {}

        for ranked_list in ranked_lists:
            for item in ranked_list:
                scores[item.chunk_id] = scores.get(item.chunk_id, 0.0) + 1.0 / (
                    self._rrf_k + item.rank
                )
                texts.setdefault(item.chunk_id, item.text)
                sources.setdefault(item.chunk_id, []).append(item.source)

        fused = [
            FusedResult(chunk_id=cid, text=texts[cid], rrf_score=score, sources=sources[cid])
            for cid, score in scores.items()
        ]
        fused.sort(key=lambda f: f.rrf_score, reverse=True)
        return fused[:top_k]
