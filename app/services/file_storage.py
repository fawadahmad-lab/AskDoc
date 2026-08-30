"""On-disk file storage helpers."""

import os

from fastapi import UploadFile

from app.core.config import settings


def save_upload(
    user_id: int,
    upload: UploadFile,
) -> str:
    """Persist an uploaded file under the configured upload directory.

    Returns the absolute path of the stored file.
    """
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"user_{user_id}_{upload.filename}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        content = upload.file.read()
        buffer.write(content)

    return file_path


def delete_file(file_path: str) -> str | None:
    """Best-effort removal of a file.

    Returns an error string if the file existed but could not be deleted,
    otherwise None.
    """
    if not file_path:
        return None

    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError as exc:
        return f"Could not remove file {file_path}: {exc}"

    return None
