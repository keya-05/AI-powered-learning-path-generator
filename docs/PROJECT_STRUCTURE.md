# Project Directory Architecture
Group BCC06 · Week 4 Sprint · Task 4.1

```
PBL/
├── docs/                                # Week 3 architecture & schema deliverables
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.sql
│   ├── GRAPH_SCHEMA.cypher
│   ├── RAG_PIPELINE.py
│   └── PROJECT_STRUCTURE.md
│
├── backend/                             # FastAPI service
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py                      # FastAPI app factory, router registration
│       ├── core/
│       │   ├── config.py                # Pydantic Settings (env-driven)
│       │   └── security.py              # JWT encode/decode, password hashing
│       ├── db/
│       │   ├── base.py                  # SQLAlchemy declarative Base + session dep
│       │   ├── postgres.py              # Engine/session factory for Postgres
│       │   ├── neo4j_client.py          # Neo4j driver singleton + session helper
│       │   └── vector_store.py          # Chroma client factory
│       ├── models/                      # SQLAlchemy ORM models (1:1 with DATABASE_SCHEMA.sql)
│       │   ├── user.py
│       │   ├── course.py
│       │   ├── resource.py
│       │   ├── concept.py
│       │   └── knowledge_profile.py
│       ├── schemas/                     # Pydantic request/response DTOs
│       │   ├── auth.py
│       │   ├── course.py
│       │   └── resource.py
│       ├── api/                         # Route handlers, grouped by resource
│       │   ├── deps.py                  # get_db, get_current_user
│       │   ├── auth.py                  # /auth/register, /auth/login
│       │   ├── courses.py               # /courses CRUD
│       │   └── resources.py             # /courses/{id}/resources upload
│       └── services/
│           ├── storage.py               # Async file persistence (local/S3-compatible)
│           └── ingestion.py             # Parser dispatch + chunking kickoff
│
└── frontend/                            # React + Tailwind CSS SPA
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── components/
        │   ├── CourseDashboard.jsx      # Active courses, mastery %, gap summary
        │   └── ResourceUploader.jsx     # Drag-and-drop upload with type tagging
        ├── pages/
        │   └── DashboardPage.jsx        # Composes CourseDashboard + ResourceUploader
        ├── hooks/
        │   └── useCourses.js            # Data-fetching hook wrapping services/api.js
        ├── context/
        │   └── AuthContext.jsx          # JWT storage + auth state provider
        └── services/
            └── api.js                   # Axios instance with auth interceptor
```

## Rationale
- **backend/app/api** stays thin — routers only validate input, delegate to `services/`, and shape the response via `schemas/`. Business logic (parsing, chunking, mastery math) never lives in a route handler.
- **backend/app/models** mirrors `docs/DATABASE_SCHEMA.sql` 1:1 so ORM drift from the DDL is easy to spot in review.
- **frontend/src/services/api.js** is the single Axios instance; every hook and component goes through it so the JWT interceptor and base URL are configured exactly once.
- Neo4j and the vector store are accessed only from `backend/app/db/*` and `backend/app/services/ingestion.py` — never directly from route handlers — keeping the dual-index write path (Task 3.1, section 2.2) centralized.
