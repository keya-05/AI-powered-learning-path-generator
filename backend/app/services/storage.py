import re
import uuid
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

_ALLOWED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

_UNSAFE_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize_filename(original_name: str) -> str:
    stem = Path(original_name).stem[:100]
    suffix = Path(original_name).suffix.lower()
    safe_stem = _UNSAFE_FILENAME_CHARS.sub("_", stem) or "resource"
    return f"{safe_stem}{suffix}"


def resolve_file_type(content_type: str, file_name: str) -> str:
    if content_type in _ALLOWED_CONTENT_TYPES:
        return _ALLOWED_CONTENT_TYPES[content_type]

    extension = Path(file_name).suffix.lower().lstrip(".")
    if extension in {"pdf", "pptx", "docx"}:
        return extension

    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Only PDF, PPTX, and DOCX files are supported.",
    )


async def save_upload(course_id: uuid.UUID, upload: UploadFile) -> tuple[str, str, str]:
    """
    Streams the upload to disk in chunks (never loading the full file into
    memory), enforcing the configured size cap while writing. Returns
    (file_type, sanitized_file_name, storage_url).
    """
    settings = get_settings()
    file_type = resolve_file_type(upload.content_type or "", upload.filename or "")
    sanitized_name = _sanitize_filename(upload.filename or "resource")

    course_dir = Path(settings.storage_root) / str(course_id)
    course_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{sanitized_name}"
    destination = course_dir / unique_name

    bytes_written = 0
    chunk_size = 1024 * 1024
    async with aiofiles.open(destination, "wb") as out_file:
        while chunk := await upload.read(chunk_size):
            bytes_written += len(chunk)
            if bytes_written > settings.max_upload_size_bytes:
                await out_file.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit.",
                )
            await out_file.write(chunk)

    if bytes_written == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    return file_type, sanitized_name, str(destination)
