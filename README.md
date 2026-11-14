# AI-Powered Personalized Learning Path Generator

**Group BCC06 · MIT-ADT University**

An AI system that ingests unstructured student resources (syllabi, PPTs, notes, PYQs) and turns them into structured course workspaces, a concept dependency graph, and diagnostic-driven, exam-optimized revision paths.

## What it does

1. **Ingests** uploaded PDFs/PPTX/DOCX and extracts text + structural metadata (units, pages, slides).
2. **Indexes twice, in parallel**:
   - A **vector index** (Chroma) of overlapping text passages, filterable by `course_id` / `unit_id` / `resource_type`, for meaning-based search.
   - A **curriculum graph** in PostgreSQL: units, concepts, prerequisite edges between concepts, and links from each concept to the passages that teach it. Passage ids are shared with Chroma, so the two indexes join directly.
3. **Profiles** each student's mastery per concept via diagnostic assessments.
4. **Detects gaps** by comparing mastery scores against a threshold, weighted by how many downstream concepts depend on them.
5. **Plans a revision path** by topologically sorting weak concepts against the prerequisite graph and time-boxing against the exam date.
6. **Grounds answers** in a RAG assistant that fuses graph traversal (upstream/downstream concept context) and dense vector search via Reciprocal Rank Fusion (RRF).

Full architecture diagram and rationale: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI (Python 3.12), SQLAlchemy 2.0 |
| Relational DB | PostgreSQL (accounts, courses, mastery, papers, and the curriculum graph) |
| Vector DB | ChromaDB, embedded in the backend (all-MiniLM-L6-v2 embeddings) |
| LLM | Anthropic Claude (concept extraction, prerequisite judgements, assistant, practice papers) |
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
- Chroma needs no server: it runs inside the backend and stores its data in `backend/chroma_data/`.

### Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then fill in DATABASE_URL, JWT_SECRET_KEY, ANTHROPIC_API_KEY
uvicorn app.main:app --reload   # http://localhost:8000
```

On startup, the app auto-creates Postgres tables from the SQLAlchemy models. To hand-run the raw DDL instead (e.g. against a shared dev DB), use [docs/DATABASE_SCHEMA.sql](docs/DATABASE_SCHEMA.sql) directly.

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
| GET | `/courses/{course_id}/graph` | Units, concepts and prerequisite links (owner also sees rejected/removed links and build details) |
| POST | `/courses/{course_id}/graph/rebuild` | Re-extract concepts and recompute links, edges and exam weights (background) |
| POST/PATCH/DELETE | `/courses/{course_id}/graph/edges[/{edge_id}]` | Instructor review: add, confirm, reject or remove a prerequisite link |
| GET/PUT | `/learning-path/{course_id}` | A student's study plan (Algorithm 2) for their saved goal, exam date and daily hours |
| GET | `/assessments/blueprint` | Preview a paper; modes `weak_focus`, `balanced`, `new_subject`, `revision`, `exam_prep` |
| GET | `/health` | Liveness check |

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

## Environment variables

See [backend/.env.example](backend/.env.example) for the full list (Postgres connection string, JWT secret, Chroma persistence path, upload size limit, Anthropic API key).

## Status

- ✅ Auth, course workspaces, schools and join codes, uploads and ingestion (PDF/PPTX/DOCX, word-piece chunking)
- ✅ Graph branch: concept extraction from the syllabus (Claude, or heading rules without an API key), concept-passage links, prerequisite edges by Eq. (1) with cycle removal and instructor review, exam weights from past papers; stored in PostgreSQL
- ✅ Practice papers with mastery updates, plus situation-specific diagnostics (new subject, revision, exam prep)
- ✅ Path planner: priority-weighted topological sort under the exam-date budget, with deferred topics and the extra hours they need
- ✅ Course-scoped assistant with hybrid graph + vector retrieval fused by RRF
- ⬜ Evaluation on real course material with human annotations (harnesses in `docs/paper/eval/`)

### Trying it with sample documents

```bash
cd backend
python -m scripts.seed_mock_data        # demo school, courses and students
python -m scripts.make_sample_docs      # synthetic CS201 syllabus, notes and past paper
python -m scripts.load_sample_course    # ingests them into CS201 and builds its graph
```

Without `ANTHROPIC_API_KEY` the graph is built with the deterministic fallbacks; the assistant and paper generation need the key.

## Contributors

Group BCC06, MIT-ADT University
