"""Attach the synthetic CS201 documents to a course, ingest them and build its graph.

    python -m scripts.make_sample_docs
    python -m scripts.load_sample_course            # course code CS201 owned by an instructor
    python -m scripts.load_sample_course --code CS201 --no-llm

Re-running replaces the sample files previously attached by this script (same
file names), so chunks and graph rows are rebuilt rather than duplicated.
"""

import argparse
import json
import shutil
import uuid
from pathlib import Path

from app.core.config import get_settings
from app.db.base import Base
from app.db.postgres import SessionLocal, engine
from app.db.schema_upgrade import upgrade_schema
from app.db.vector_store import get_chunk_collection
from app.models import Course, Resource, User
from app.services.course_graph import rebuild_course_graph
from app.services.ingestion import ingest_resource

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

        course_dir = Path(get_settings().storage_root) / str(course.id)
        course_dir.mkdir(parents=True, exist_ok=True)
        for file_name, resource_type in FILES:
            source = SAMPLE_DIR / file_name
            if not source.is_file():
                raise SystemExit(f"Missing {source}. Run python -m scripts.make_sample_docs first.")
            for old in db.query(Resource).filter(Resource.course_id == course.id, Resource.file_name == file_name):
                get_chunk_collection().delete(where={"resource_id": str(old.id)})
                Path(old.storage_url).unlink(missing_ok=True)
                db.delete(old)
            db.commit()

            target = course_dir / f"{uuid.uuid4().hex}_{file_name}"
            shutil.copyfile(source, target)
            resource = Resource(
                course_id=course.id, file_name=file_name, file_type="pdf",
                resource_type=resource_type, storage_url=str(target), processing_status="pending",
            )
            db.add(resource)
            db.commit()
            count = ingest_resource(db, resource)
            print(f"Indexed {file_name}: {count} passages")

        details = rebuild_course_graph(db, course, extract=True, use_llm=not args.no_llm)
        print(json.dumps(details, indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
