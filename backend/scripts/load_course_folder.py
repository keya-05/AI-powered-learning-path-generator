"""Load a real course's files from a folder, ingest them and build the course graph.

Folder layout (any of the four subfolders may be missing; PDF, PPTX or DOCX):

    <folder>/syllabus/   the university syllabus
    <folder>/notes/      lecture notes
    <folder>/ppt/        slide decks
    <folder>/pyq/        previous-year question papers

    python -m scripts.load_course_folder --code CS402 --title "High Performance Computing" --folder D:/courses/hpc
    python -m scripts.load_course_folder --code CS405 --title "Natural Language Processing" --folder D:/courses/nlp --no-llm

The course is created for the instructor (default teacher@gmail.com) when it
doesn't exist. Re-running replaces files with the same name, so passages and
graph rows are rebuilt rather than duplicated. Prints the graph-build summary,
which is also what Sec. III-H of the paper needs (files, pages, passages).
"""

import argparse
import json
import shutil
import uuid
from pathlib import Path

from app.core.codes import new_join_code
from app.core.config import get_settings
from app.db.base import Base
from app.db.postgres import SessionLocal, engine
from app.db.schema_upgrade import upgrade_schema
from app.db.vector_store import get_chunk_collection
from app.models import Course, Resource, User
from app.services.course_graph import rebuild_course_graph
from app.services.ingestion import ingest_resource, parse_resource

RESOURCE_TYPES = ("syllabus", "notes", "ppt", "pyq")
FILE_TYPES = {".pdf": "pdf", ".pptx": "pptx", ".docx": "docx"}


def find_files(folder: Path) -> list[tuple[Path, str]]:
    files = []
    for resource_type in RESOURCE_TYPES:
        sub = folder / resource_type
        if sub.is_dir():
            files += [(p, resource_type) for p in sorted(sub.iterdir()) if p.suffix.lower() in FILE_TYPES]
    return files


def load_files(db, course: Course, files: list[tuple[Path, str]]) -> list[dict]:
    """Copy, register and ingest each file; returns per-file counts."""
    course_dir = Path(get_settings().storage_root) / str(course.id)
    course_dir.mkdir(parents=True, exist_ok=True)
    report = []
    for source, resource_type in files:
        for old in db.query(Resource).filter(Resource.course_id == course.id, Resource.file_name == source.name):
            get_chunk_collection().delete(where={"resource_id": str(old.id)})
            if "://" not in old.storage_url:
                Path(old.storage_url).unlink(missing_ok=True)
            db.delete(old)
        db.commit()

        target = course_dir / f"{uuid.uuid4().hex}_{source.name}"
        shutil.copyfile(source, target)
        file_type = FILE_TYPES[source.suffix.lower()]
        resource = Resource(
            course_id=course.id, file_name=source.name, file_type=file_type,
            resource_type=resource_type, storage_url=str(target), processing_status="pending",
        )
        db.add(resource)
        db.commit()
        try:
            passages = ingest_resource(db, resource)
            pages = len(parse_resource(str(target), file_type))
            report.append({"file": source.name, "type": resource_type, "pages_with_text": pages, "passages": passages})
        except Exception as error:  # a scanned PDF without a text layer, a corrupt file
            report.append({"file": source.name, "type": resource_type, "error": f"{type(error).__name__}: {error}"})
        print(json.dumps(report[-1]))
    return report


def get_or_create_course(db, code: str, title: str, description: str | None, instructor_email: str) -> Course:
    instructor = db.query(User).filter(User.email == instructor_email, User.role == "instructor").first()
    if instructor is None:
        raise SystemExit(f"No instructor account {instructor_email}. Register one first, or pass --instructor.")
    course = db.query(Course).filter(Course.user_id == instructor.id, Course.code == code).first()
    if course is None:
        course = Course(
            title=title, code=code, description=description, user_id=instructor.id,
            join_code=new_join_code(db, Course.join_code), organization_id=instructor.organization_id,
        )
        db.add(course)
        db.commit()
        print(f"Created course {code} ({title}), join code {course.join_code}")
    return course


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--folder", required=True, type=Path)
    parser.add_argument("--description")
    parser.add_argument("--instructor", default="teacher@gmail.com")
    parser.add_argument("--no-llm", action="store_true", help="Build the graph with the deterministic fallbacks only.")
    args = parser.parse_args()

    files = find_files(args.folder)
    if not files:
        raise SystemExit(f"No PDF/PPTX/DOCX files under {args.folder}/{{{','.join(RESOURCE_TYPES)}}}/")

    Base.metadata.create_all(bind=engine)
    upgrade_schema(engine)
    db = SessionLocal()
    try:
        course = get_or_create_course(db, args.code, args.title, args.description, args.instructor)
        report = load_files(db, course, files)
        details = rebuild_course_graph(db, course, extract=True, use_llm=not args.no_llm)
        summary = {
            "course": args.code,
            "files": {t: sum(1 for r in report if r["type"] == t and "error" not in r) for t in RESOURCE_TYPES},
            "pages_with_text": sum(r.get("pages_with_text", 0) for r in report),
            "passages": sum(r.get("passages", 0) for r in report),
            "failed_files": [r["file"] for r in report if "error" in r],
            "graph": details,
        }
        print(json.dumps(summary, indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
