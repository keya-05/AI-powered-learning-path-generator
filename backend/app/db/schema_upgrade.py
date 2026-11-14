"""Additive schema changes for databases created before a column existed.

`Base.metadata.create_all` creates missing tables but never alters existing
ones, so new columns on existing tables are added here. Each ALTER runs only
when its column is actually missing, so a normal startup takes no table locks.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.core.codes import new_join_code

# (table, column, column definition)
_COLUMNS = [
    ("users", "organization_id", "UUID REFERENCES organizations(id) ON DELETE SET NULL"),
    ("courses", "join_code", "VARCHAR(12) UNIQUE"),
    ("courses", "organization_id", "UUID REFERENCES organizations(id) ON DELETE SET NULL"),
    ("concepts", "position", "INTEGER NOT NULL DEFAULT 0"),
    ("concepts", "source", "VARCHAR(20) NOT NULL DEFAULT 'manual'"),
    ("concepts", "exam_marks", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
]

# Practice-paper modes grew the situation-specific diagnostics (Sec. III-E).
_PAPER_MODES = "('weak_focus', 'balanced', 'assigned', 'new_subject', 'revision', 'exam_prep')"


def upgrade_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    existing = {table: {c["name"] for c in inspector.get_columns(table)} for table, _, _ in _COLUMNS}
    missing = [(t, c, d) for t, c, d in _COLUMNS if c not in existing[t]]
    if missing:
        with engine.begin() as connection:
            for table, column, definition in missing:
                connection.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {definition}"))

    mode_check = [
        c["sqltext"] for c in inspector.get_check_constraints("practice_papers") if c["name"] == "ck_practice_papers_mode"
    ]
    if mode_check and "exam_prep" not in str(mode_check[0]):
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE practice_papers DROP CONSTRAINT ck_practice_papers_mode"))
            connection.execute(
                text(f"ALTER TABLE practice_papers ADD CONSTRAINT ck_practice_papers_mode CHECK (mode IN {_PAPER_MODES})")
            )

    # Give every instructor-run course created before join codes a code.
    from app.models.course import Course
    from app.models.user import User

    with Session(engine) as db:
        courses = (
            db.query(Course)
            .join(User, User.id == Course.user_id)
            .filter(Course.join_code.is_(None), User.role == "instructor")
            .all()
        )
        for course in courses:
            course.join_code = new_join_code(db, Course.join_code)
            db.flush()
        db.commit()
