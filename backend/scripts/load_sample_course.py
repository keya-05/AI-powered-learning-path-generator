"""Attach the synthetic CS201 documents to a course, ingest them and build its graph.

    python -m scripts.make_sample_docs
    python -m scripts.load_sample_course            # course code CS201 owned by an instructor
    python -m scripts.load_sample_course --code CS201 --no-llm

Re-running replaces the sample files previously attached by this script (same
file names), so chunks and graph rows are rebuilt rather than duplicated.
"""

import argparse
import json
from pathlib import Path

from app.db.base import Base
from app.db.postgres import SessionLocal, engine
from app.db.schema_upgrade import upgrade_schema
from app.models import Course, User
from app.services.course_graph import rebuild_course_graph
from scripts.load_course_folder import load_files

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_data" / "cs201"
FILES = [
    ("CS201_Sample_Syllabus.pdf", "syllabus"),
    ("CS201_Sample_Notes.pdf", "notes"),
    ("CS201_Sample_PYQ_2024.pdf", "pyq"),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", default="CS201")
    parser.add_argument("--no-llm", action="store_true", help="Use the deterministic fallbacks only.")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    upgrade_schema(engine)
    db = SessionLocal()
    try:
        course = (
            db.query(Course).join(User, User.id == Course.user_id)
            .filter(Course.code == args.code, User.role == "instructor").first()
        )
        if course is None:
            raise SystemExit(f"No instructor course with code {args.code}. Run scripts.seed_mock_data first.")

        files = []
        for file_name, resource_type in FILES:
            source = SAMPLE_DIR / file_name
            if not source.is_file():
                raise SystemExit(f"Missing {source}. Run python -m scripts.make_sample_docs first.")
            files.append((source, resource_type))
        load_files(db, course, files)

        details = rebuild_course_graph(db, course, extract=True, use_llm=not args.no_llm)
        print(json.dumps(details, indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
