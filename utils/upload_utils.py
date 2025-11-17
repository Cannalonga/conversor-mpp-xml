import os
import uuid
import pathlib
from werkzeug.utils import secure_filename

# Allowed extensions for uploads
ALLOWED_EXT = {'.mpp', '.xml'}

def allowed_file(filename: str) -> bool:
    """Return True if filename has an allowed extension."""
    return pathlib.Path(filename).suffix.lower() in ALLOWED_EXT

def generate_safe_filename(original_filename: str) -> str:
    """Return a uuid filename with same extension, safe for filesystem."""
    ext = pathlib.Path(original_filename).suffix.lower()
    return f"{uuid.uuid4()}{ext}"

def ensure_upload_dir(path: str):
    os.makedirs(path, exist_ok=True)