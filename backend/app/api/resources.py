import logging
import uuid

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.courses import get_accessible_course_or_404, get_owned_course_or_404
from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.postgres import get_db
from app.db.vector_store import get_chunk_collection
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceResponse, StudentResourceResponse
from app.services.course_graph import rebuild_course_graph, rebuild_in_background
from app.services.ingestion import ingest_resource
from app.services.storage import save_upload

logger = logging.getLogger(__name__)

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
    current_user: User = Depends(get_current_user),
) -> ResourceResponse:
    # The course owner uploads: an instructor to their course, a student to their own subject.
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
    current_user: User = Depends(get_current_user),
) -> list[ResourceResponse]:
    get_owned_course_or_404(db, course_id, current_user.id)
    return (
        db.query(Resource)
        .filter(Resource.course_id == course_id)
        .order_by(Resource.created_at.desc())
        .all()
    )


@router.get("/{course_id}/materials", response_model=list[StudentResourceResponse])
def list_course_materials(
    course_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StudentResourceResponse]:
    """Material an enrolled student (or the owning instructor) can open.

    Failed uploads are shown only to the course owner (the instructor, or the
    student whose own subject it is).
    """
    course = get_accessible_course_or_404(db, course_id, current_user)
    query = db.query(Resource).filter(Resource.course_id == course_id)
    if course.user_id != current_user.id:
        query = query.filter(Resource.processing_status != "failed")
    resources = query.order_by(Resource.created_at.desc()).all()
    return [
        StudentResourceResponse(
            id=resource.id,
            course_id=resource.course_id,
            file_name=resource.file_name,
            file_type=resource.file_type,
            resource_type=resource.resource_type,
            created_at=resource.created_at,
            available=_stored_file(resource) is not None,
            processing_status=resource.processing_status,
        )
        for resource in resources
    ]


_MEDIA_TYPES = {
    "pdf": "application/pdf",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.get("/{course_id}/resources/{resource_id}/download")
def download_resource(
    course_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    get_accessible_course_or_404(db, course_id, current_user)
    resource = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.course_id == course_id)
        .first()
    )
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")

    path = _stored_file(resource)
    if path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This file isn't stored on the server. Ask your instructor to upload it again.",
        )
    return FileResponse(
        path, media_type=_MEDIA_TYPES.get(resource.file_type), filename=resource.file_name
    )


@router.delete("/{course_id}/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    course_id: uuid.UUID,
    resource_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    get_owned_course_or_404(db, course_id, current_user.id)
    resource = (
        db.query(Resource)
        .filter(Resource.id == resource_id, Resource.course_id == course_id)
        .first()
    )
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")

    path = _stored_file(resource)
    try:
        # Drop its chunks so the assistant stops citing a deleted file.
        get_chunk_collection().delete(where={"resource_id": str(resource.id)})
    except Exception:
        logger.warning("Couldn't remove chunks for resource %s", resource.id, exc_info=True)
    db.delete(resource)
    db.commit()
    if path is not None:
        path.unlink(missing_ok=True)
    background_tasks.add_task(rebuild_in_background, course_id, False)


def _stored_file(resource: Resource) -> Path | None:
    """The file on disk, only if it sits inside the storage root (guards against odd storage_url values)."""
    if "://" in resource.storage_url:
        return None
    root = Path(get_settings().storage_root).resolve()
    path = Path(resource.storage_url).resolve()
    if not path.is_file() or root not in path.parents:
        return None
    return path


def _run_ingestion(resource_id: uuid.UUID) -> None:
    from app.db.postgres import SessionLocal

    db = SessionLocal()
    try:
        resource = db.get(Resource, resource_id)
        if resource is None:
            return
        ingest_resource(db, resource)
        # Graph branch: re-extract concepts only when a syllabus arrives; every
        # upload refreshes concept links, prerequisite edges and exam weights.
        course = resource.course
        rebuild_course_graph(db, course, extract=resource.resource_type == "syllabus")
    except Exception:
        logger.exception("Ingestion failed for resource %s", resource_id)
    finally:
        db.close()
