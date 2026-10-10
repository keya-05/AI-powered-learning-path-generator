"""Seed the Postgres DB with a small, realistic mock dataset for teacher@gmail.com.

Run from the backend directory:

    python -m scripts.seed_mock_data

Re-running is safe: the instructor's courses and the mock students are wiped and
recreated, so the data always matches this file.
"""

import random
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.base import Base
from app.db.postgres import SessionLocal, engine
from app.models import Concept, Course, Enrollment, Resource, StudentKnowledgeProfile, User

INSTRUCTOR_EMAIL = "teacher@gmail.com"
EXISTING_STUDENT_EMAIL = "keya@gmail.com"
MOCK_STUDENT_DOMAIN = "student.edu"
MOCK_STUDENT_PASSWORD = "Password123"

# (code, title, description, {unit_number: [(concept, difficulty 0-1), ...]})
COURSES = [
    (
        "CS201",
        "Data Structures & Algorithms",
        "Core linear and non-linear data structures, algorithm design and complexity analysis.",
        {
            1: [("Arrays & Complexity", 0.10), ("Linked Lists", 0.20)],
            2: [("Stacks & Queues", 0.20), ("Hashing", 0.30)],
            3: [("Binary Trees", 0.40), ("AVL Tree Rotations", 0.65), ("Heaps", 0.45)],
            4: [("Graph Traversal", 0.45), ("Topological Sort", 0.60), ("Shortest Paths", 0.55)],
            5: [("DP State Transitions", 0.70), ("Knapsack Problems", 0.60)],
        },
    ),
    (
        "CS301",
        "Database Management Systems",
        "Relational modelling, SQL, normalization, transactions and storage internals.",
        {
            1: [("ER Modelling", 0.15), ("Relational Algebra", 0.35)],
            2: [("SQL Joins", 0.25), ("Nested Subqueries", 0.40)],
            3: [("Functional Dependencies", 0.50), ("Normalization up to BCNF", 0.60)],
            4: [("Transactions & ACID", 0.35), ("Concurrency Control", 0.65)],
            5: [("Indexing & B+ Trees", 0.55)],
        },
    ),
    (
        "CS302",
        "Operating Systems",
        "Processes, scheduling, synchronization, memory management and file systems.",
        {
            1: [("Processes & Threads", 0.15), ("CPU Scheduling", 0.30)],
            2: [("Process Synchronization", 0.55), ("Deadlocks", 0.50)],
            3: [("Paging", 0.40), ("Virtual Memory", 0.55)],
            4: [("File Systems", 0.30)],
        },
    ),
]

# (file_name, file_type, resource_type, processing_status, days_ago)
RESOURCES = {
    "CS201": [
        ("CS201_Syllabus_2026.pdf", "pdf", "syllabus", "indexed", 40),
        ("Trees_and_Heaps_Lecture.pptx", "pptx", "ppt", "indexed", 21),
        ("Graph_Algorithms_Notes.pdf", "pdf", "notes", "indexed", 12),
        ("DSA_PYQ_2024.pdf", "pdf", "pyq", "indexed", 6),
        ("Dynamic_Programming_Patterns.docx", "docx", "notes", "processing", 1),
    ],
    "CS301": [
        ("CS301_Syllabus_2026.pdf", "pdf", "syllabus", "indexed", 38),
        ("Normalization_Worked_Examples.pdf", "pdf", "notes", "indexed", 15),
        ("Transactions_Lecture.pptx", "pptx", "ppt", "indexed", 9),
        ("DBMS_PYQ_2023.pdf", "pdf", "pyq", "failed", 4),
    ],
    "CS302": [
        ("CS302_Syllabus_2026.pdf", "pdf", "syllabus", "indexed", 30),
        ("Memory_Management_Notes.docx", "docx", "notes", "indexed", 10),
        ("OS_PYQ_2024.pdf", "pdf", "pyq", "pending", 0),
    ],
}

# (email local part, ability 0-1, enrolled course codes)
MOCK_STUDENTS = [
    ("aarav.sharma", 0.88, ["CS201", "CS301", "CS302"]),
    ("ananya.iyer", 0.62, ["CS201", "CS301"]),
    ("rahul.verma", 0.42, ["CS201", "CS302"]),
    ("meera.nair", 0.70, ["CS201", "CS301"]),
    ("kabir.shah", 0.35, ["CS201", "CS301", "CS302"]),
    ("diya.patel", 0.78, ["CS301", "CS302"]),
    ("devansh.rao", 0.50, ["CS201"]),
    ("isha.kapoor", 0.66, ["CS201", "CS302"]),
    ("arjun.mehta", 0.56, ["CS301"]),
    ("sneha.reddy", 0.82, ["CS201", "CS302"]),
]

EXISTING_STUDENT_ABILITY = 0.60
EXISTING_STUDENT_COURSES = ["CS201", "CS301"]


def _mastery(rng: random.Random, ability: float, difficulty: float) -> float:
    score = 0.55 + (ability - difficulty) * 0.9 + rng.uniform(-0.12, 0.12)
    return round(min(max(score, 0.05), 0.98), 2)


def _reset(db, instructor: User) -> None:
    for course in db.query(Course).filter(Course.user_id == instructor.id).all():
        db.delete(course)
    for student in db.query(User).filter(User.email.like(f"%@{MOCK_STUDENT_DOMAIN}")).all():
        db.delete(student)
    db.flush()


def _enroll_with_profiles(db, rng, student: User, ability: float, codes: list[str], courses, now) -> None:
    for code in codes:
        course, concepts = courses[code]
        db.add(
            Enrollment(
                student_id=student.id,
                course_id=course.id,
                enrolled_at=now - timedelta(days=rng.randint(20, 45)),
            )
        )
        for concept, difficulty in concepts:
            # Leave the hardest, latest-unit concepts unassessed for some students.
            if concept.unit_number >= 4 and rng.random() < 0.25:
                continue
            db.add(
                StudentKnowledgeProfile(
                    user_id=student.id,
                    concept_id=concept.id,
                    mastery_score=_mastery(rng, ability, difficulty),
                    last_assessed_at=now - timedelta(days=rng.randint(0, 14)),
                )
            )


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    rng = random.Random(42)
    now = datetime.now(timezone.utc)

    db = SessionLocal()
    try:
        instructor = db.query(User).filter(User.email == INSTRUCTOR_EMAIL).first()
        if instructor is None:
            raise SystemExit(
                f"{INSTRUCTOR_EMAIL} not found. Register it as an instructor in the app first."
            )

        _reset(db, instructor)

        courses: dict[str, tuple[Course, list[tuple[Concept, float]]]] = {}
        for code, title, description, units in COURSES:
            course = Course(
                title=title,
                code=code,
                description=description,
                user_id=instructor.id,
                created_at=now - timedelta(days=45),
            )
            db.add(course)
            db.flush()

            concepts = []
            for unit_number, unit_concepts in units.items():
                for concept_title, difficulty in unit_concepts:
                    concept = Concept(
                        course_id=course.id, title=concept_title, unit_number=unit_number
                    )
                    db.add(concept)
                    concepts.append((concept, difficulty))
            db.flush()
            courses[code] = (course, concepts)

            for file_name, file_type, resource_type, status, days_ago in RESOURCES[code]:
                db.add(
                    Resource(
                        course_id=course.id,
                        file_name=file_name,
                        file_type=file_type,
                        resource_type=resource_type,
                        storage_url=f"mock://{code}/{file_name}",
                        processing_status=status,
                        created_at=now - timedelta(days=days_ago, hours=rng.randint(0, 8)),
                    )
                )

        password_hash = hash_password(MOCK_STUDENT_PASSWORD)
        for local_part, ability, codes in MOCK_STUDENTS:
            student = User(
                email=f"{local_part}@{MOCK_STUDENT_DOMAIN}",
                password_hash=password_hash,
                role="student",
            )
            db.add(student)
            db.flush()
            _enroll_with_profiles(db, rng, student, ability, codes, courses, now)

        existing_student = db.query(User).filter(User.email == EXISTING_STUDENT_EMAIL).first()
        if existing_student is not None and existing_student.role == "student":
            _enroll_with_profiles(
                db, rng, existing_student, EXISTING_STUDENT_ABILITY, EXISTING_STUDENT_COURSES, courses, now
            )

        db.commit()

        concept_count = sum(len(concepts) for _, concepts in courses.values())
        print(f"Seeded {len(courses)} courses, {concept_count} concepts and "
              f"{sum(len(r) for r in RESOURCES.values())} resources for {INSTRUCTOR_EMAIL}.")
        print(f"Created {len(MOCK_STUDENTS)} mock students (password: {MOCK_STUDENT_PASSWORD}).")
        if existing_student is not None:
            print(f"Enrolled {EXISTING_STUDENT_EMAIL} in {', '.join(EXISTING_STUDENT_COURSES)}.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
