# System Architecture — AI-Powered Personalized Learning Path Generator
Group BCC06 · Week 3 Sprint · Task 3.1

## 1. End-to-End Pipeline (ASCII Diagram)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT (React SPA)                                      │
│   ResourceUploader.jsx  ──────────────────────────────────────────┐                        │
│   CourseDashboard.jsx                                             │                        │
└────────────────────────────────────────────────────────────────┬─┴────────────────────────┘
                                                                   │ multipart/form-data (JWT auth)
                                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FASTAPI GATEWAY (app/api)                                   │
│   POST /courses/{id}/resources  →  validates MIME, size, ownership                          │
└────────────────────────────────────────────────────────────────┬───────────────────────────┘
                                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              1. INGESTION SERVICE (app/services/ingestion.py)               │
│   ┌────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────────┐    │
│   │ File Upload Sink    │→ │ Parser Dispatch        │→ │ Text & Metadata Extractor     │    │
│   │ (local disk / S3)   │   │ .pdf → PyMuPDF (fitz) │   │ - page_no, slide_no          │    │
│   │ storage_url persist │   │ .pptx → python-pptx   │   │ - section/unit heuristics    │    │
│   │ to `resources` row  │   │ .docx → unstructured  │   │ - raw_text + layout blocks   │    │
│   └────────────────────┘   └───────────────────────┘   └───────────────┬───────────────┘    │
└──────────────────────────────────────────────────────────────────────┬─┴───────────────────┘
                                                                         │ ExtractedDocument
                                                                         ▼
                                        ┌────────────────────────────────────────────────┐
                                        │      2. DUAL GRAPH-VECTOR INDEXING (fan-out)    │
                                        └───────────────┬────────────────────┬────────────┘
                            ┌──────────────────────────┘                    └───────────────────────────┐
                            ▼                                                                             ▼
┌───────────────────────────────────────────────────┐               ┌────────────────────────────────────────────────────┐
│  2A. VECTOR INDEXING BRANCH                        │               │  2B. GRAPH INDEXING BRANCH                          │
│  ┌───────────────────────────────────────────┐    │               │  ┌────────────────────────────────────────────┐    │
│  │ Hierarchical / Hybrid Chunker              │    │               │  │ Concept Extraction (LLM function-calling)   │    │
│  │  - parent: unit/topic node                 │    │               │  │  - candidate concept titles                 │    │
│  │  - child: 300-500 token semantic chunks    │    │               │  │  - prerequisite hints from co-occurrence    │    │
│  └───────────────────┬─────────────────────────┘   │               │  └───────────────────┬────────────────────────┘   │
│                       ▼                             │               │                      ▼                            │
│  ┌───────────────────────────────────────────┐     │               │  ┌────────────────────────────────────────────┐   │
│  │ Embedding Model (e.g. bge-small / OpenAI)  │     │               │  │ Neo4j Writer                                │   │
│  └───────────────────┬─────────────────────────┘    │               │  │  MERGE (:Course)-[:HAS_UNIT]->(:Unit)       │   │
│                       ▼                             │               │  │  MERGE (:Unit)-[:CONTAINS]->(:Concept)      │   │
│  ┌───────────────────────────────────────────┐     │               │  │  MERGE (:Concept)-[:EXTRACTED_FROM]->        │   │
│  │ Vector DB (Chroma / FAISS)                 │     │               │  │        (:ResourceChunk)                     │   │
│  │  metadata: course_id, unit_id,             │◄────┼───────────────┼──│  (:Concept)-[:REQUIRES_PREREQUISITE]->      │   │
│  │            resource_type, chunk_id         │     │  shared        │  │        (:Concept)                          │   │
│  └───────────────────────────────────────────┘     │  chunk_id      │  └────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘  join key       └────────────────────────────────────────────────────┘
                            │                                                                             │
                            └──────────────────────────────┬──────────────────────────────────────────────┘
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       3. ENGINE CORE                                                    │
│  ┌───────────────────────┐   ┌──────────────────┐   ┌───────────────────────┐   ┌───────────────────┐ │
│  │ Diagnostic Assessment │→ │ Gap Detector       │→ │ Path Planning Engine   │→ │ RAG Assistant       │ │
│  │  - adaptive quiz per  │   │  - compares        │   │  - topological sort of│   │  - hybrid retrieval│ │
│  │    unit/concept       │   │    mastery_score   │   │    REQUIRES_          │   │    (graph + vector)│ │
│  │  - writes             │   │    vs. threshold   │   │    PREREQUISITE graph │   │  - grounded Q&A /  │ │
│  │    student_knowledge_ │   │  - ranks weak       │   │  - time-boxes by exam │   │    explanations    │ │
│  │    profiles           │   │    concepts         │   │    date & mastery gap │   │                    │ │
│  └───────────────────────┘   └──────────────────┘   └───────────┬───────────┘   └─────────┬─────────┘ │
└───────────────────────────────────────────────────────────────┬┴───────────────────────────┴───────────┘
                                                                   ▼
                                                   ┌───────────────────────────────┐
                                                   │  Personalized Revision Path    │
                                                   │  (ordered concept sequence +   │
                                                   │   grounded explanations/PYQs)  │
                                                   └───────────────────────────────┘
```

## 2. Structural Breakdown

### 2.1 Input Pipeline
| Stage | Component | Responsibility |
|---|---|---|
| Upload | `ResourceUploader.jsx` → `POST /courses/{id}/resources` | Accepts PDF/PPTX/DOCX, tags resource_type (Syllabus/PYQ/Notes/PPT) |
| Ingestion Service | `app/services/ingestion.py` | Persists file, creates `resources` row, dispatches parser by MIME type |
| Parser | PyMuPDF (PDF), python-pptx (PPTX), unstructured (DOCX/mixed) | Extracts raw text blocks, page/slide numbers, layout hints |
| Extractor | `TextMetadataExtractor` | Normalizes into `ExtractedDocument{ course_id, resource_id, blocks[] }` |

### 2.2 Dual Graph-Vector Indexing
Both branches consume the **same** `ExtractedDocument` and share a deterministic `chunk_id` (UUID derived from `resource_id + block_offset`) as the join key between Postgres/Vector metadata and Neo4j `:ResourceChunk` nodes — this is what makes hybrid retrieval possible later (Task 3.3).

- **Vector branch**: hierarchical chunking → embedding → Chroma/FAISS upsert, metadata-filterable by `course_id`, `unit_id`, `resource_type`.
- **Graph branch**: LLM-assisted concept extraction → Neo4j MERGE of `Concept`, `Unit`, `ResourceChunk` nodes and `REQUIRES_PREREQUISITE` edges (derived from syllabus ordering + co-occurrence + explicit "prerequisite" language in source text).

### 2.3 Engine Core
1. **Diagnostic Assessment** — adaptive quiz seeded from `concepts` per unit; results written to `student_knowledge_profiles.mastery_score`.
2. **Gap Detector** — flags concepts below a mastery threshold (e.g. `< 0.6`), weighted by proximity to exam date and by how many downstream concepts depend on them (graph fan-out).
3. **Path Planning Engine** — topologically sorts the `REQUIRES_PREREQUISITE` subgraph restricted to gap concepts, then time-boxes study sessions against the user-supplied exam date.
4. **RAG Assistant** — answers student questions / generates explanations, grounding responses via the hybrid retrieval strategy in Task 3.3.
