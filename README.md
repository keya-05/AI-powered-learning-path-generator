# AI-Powered Personalized Learning Path Generator

**Group BCC06 · MIT-ADT University**

An AI system that ingests unstructured student resources (syllabi, PPTs, notes, PYQs) and turns them into structured course workspaces, a concept dependency graph, and diagnostic-driven, exam-optimized revision paths.

## What it does

1. **Ingests** uploaded PDFs/PPTX/DOCX and extracts text + structural metadata (units, pages, slides).
2. **Indexes twice, in parallel**:
   - A **Vector DB** (Chroma/FAISS) of hierarchically chunked text, filterable by `course_id` / `unit_id` / `resource_type`.
   - A **Knowledge Graph** (Neo4j) of `Course → Unit → Concept` structure with `REQUIRES_PREREQUISITE` edges between concepts.
3. **Profiles** each student's mastery per concept via diagnostic assessments.
4. **Detects gaps** by comparing mastery scores against a threshold, weighted by how many downstream concepts depend on them.
5. **Plans a revision path** by topologically sorting weak concepts against the prerequisite graph and time-boxing against the exam date.
6. **Grounds answers** in a RAG assistant that fuses graph traversal (upstream/downstream concept context) and dense vector search via Reciprocal Rank Fusion (RRF).

Full architecture diagram and rationale: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python 3.12), SQLAlchemy 2.0 |
| Relational DB | PostgreSQL |
| Graph DB | Neo4j |
| Vector DB | ChromaDB |
| Auth | JWT (python-jose) + bcrypt (PassLib) |
| Document parsing | PyMuPDF (PDF), python-pptx (PPTX), unstructured (DOCX) |
| Frontend | React 18 + Vite + Tailwind CSS |

## Project structure

```
PBL/
├── docs/           # Architecture, DB/graph schemas, RAG pipeline design
├── backend/        # FastAPI service
└── frontend/       # React + Tailwind SPA
```

See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) for the full annotated layout.

## Getting started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- Neo4j 5+ (Community Edition is fine)

### Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in DATABASE_URL, JWT_SECRET_KEY, NEO4J_*
uvicorn app.main:app --reload   # http://localhost:8000
```

On startup, the app auto-creates Postgres tables from the SQLAlchemy models. To hand-run the raw DDL instead (e.g. against a shared dev DB), use [docs/DATABASE_SCHEMA.sql](docs/DATABASE_SCHEMA.sql) directly.

To provision the Neo4j constraints/indexes, run the statements in [docs/GRAPH_SCHEMA.cypher](docs/GRAPH_SCHEMA.cypher) once via `cypher-shell` or Neo4j Browser.

API docs (Swagger UI) are served at `http://localhost:8000/docs` once the server is running.

### Frontend setup

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Set `VITE_API_BASE_URL` in a `frontend/.env` file if the backend isn't on `http://localhost:8000`.

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account, returns a JWT |
| POST | `/auth/login` | Authenticate, returns a JWT |
| POST | `/courses` | Create a course |
| GET | `/courses` | List the current user's courses with mastery % and gap counts |
| POST | `/courses/{course_id}/resources` | Upload a syllabus/notes/PYQ/PPT file (multipart), kicks off async ingestion |
| GET | `/health` | Liveness check |

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

## Environment variables

See [backend/.env.example](backend/.env.example) for the full list (Postgres connection string, JWT secret, Neo4j credentials, Chroma persistence path, upload size limit).

## Status

- ✅ Week 3 — system architecture, database/graph schemas, hybrid RAG pipeline design
- ✅ Week 4 — auth + course workspace backend, course dashboard & resource uploader frontend
- ⬜ Concept extraction → Neo4j writer (LLM-assisted, planned)
- ⬜ Diagnostic assessment engine + adaptive quiz generation
- ⬜ Path Planning Engine (topological sort + time-boxing)
- ⬜ RAG Assistant chat UI

## Contributors

Group BCC06, MIT-ADT University
