import os
from io import BytesIO
from typing import List
import mimetypes

from fastapi import UploadFile


STORAGE_DIR = os.path.abspath(os.getenv("STORAGE_DIR", "./storage"))
IMAGES_DIR = os.path.join(STORAGE_DIR, "images")
DOCS_DIR = os.path.join(STORAGE_DIR, "documents")


def init_storage() -> None:
    os.makedirs(IMAGES_DIR, exist_ok=True)
    os.makedirs(DOCS_DIR, exist_ok=True)


class SavedPath:
    def __init__(self, path: str) -> None:
        self.path = path


def save_upload_files(process_id: int, files: List[UploadFile]) -> List[SavedPath]:
    saved: List[SavedPath] = []
    proc_dir = os.path.join(IMAGES_DIR, str(process_id))
    os.makedirs(proc_dir, exist_ok=True)
    for idx, f in enumerate(files):
        ext = os.path.splitext(f.filename or "image")[1] or ".jpg"
        dest = os.path.join(proc_dir, f"{idx}_{os.path.basename(f.filename or 'image')}")
        with open(dest, "wb") as out:
            out.write(f.file.read())
        saved.append(SavedPath(dest))
    return saved


def save_document(process_id: int, filename: str, content: bytes) -> str:
    proc_dir = os.path.join(DOCS_DIR, str(process_id))
    os.makedirs(proc_dir, exist_ok=True)
    path = os.path.join(proc_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    return path


def open_document_stream(path: str):
    filename = os.path.basename(path)
    mime, _ = mimetypes.guess_type(path)
    if not mime:
        # heurística simples para PDF; senão, binário genérico
        if path.lower().endswith(".pdf"):
            mime = "application/pdf"
        else:
            mime = "application/octet-stream"
    stream = open(path, "rb")
    return stream, mime, filename


