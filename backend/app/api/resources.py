import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.courses import get_owned_course_or_404
from app.api.deps import require_role
from app.db.postgres import get_db
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceResponse
from app.services.ingestion import ingest_resource
from app.services.storage import save_upload

router = APIRouter(prefix="/courses", tags=["resources"])

_VALID_RESOURCE_TYPES = {"syllabus", "pyq", "notes", "ppt"}


@router.post(
    "/{course_id}/resources",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_resource(
    course_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    resource_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> ResourceResponse:
    get_owned_course_or_404(db, course_id, current_user.id)

    if resource_type not in _VALID_RESOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"resource_type must be one of {sorted(_VALID_RESOURCE_TYPES)}.",
        )

    file_type, file_name, storage_url = await save_upload(course_id, file)

    resource = Resource(
        course_id=course_id,
        file_name=file_name,
        file_type=file_type,
        resource_type=resource_type,
        storage_url=storage_url,
        processing_status="pending",
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    background_tasks.add_task(_run_ingestion, resource.id)
    return resource


@router.get("/{course_id}/resources", response_model=list[ResourceResponse])
def list_resources(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("instructor")),
) -> list[ResourceResponse]:
    get_owned_course_or_404(db, course_id, current_user.id)
    return (
        db.query(Resource)
        .filter(Resource.course_id == course_id)
        .order_by(Resource.created_at.desc())
        .all()
    )


def _run_ingestion(resource_id: uuid.UUID) -> None:
    from app.db.postgres import SessionLocal

    db = SessionLocal()
    try:
        resource = db.get(Resource, resource_id)
        if resource is not None:
            ingest_resource(db, resource)
    finally:
        db.close()
