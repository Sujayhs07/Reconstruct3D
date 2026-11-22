import os
import re
import hashlib
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from backend.config import settings

SAFE_PROJECT_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]+$")

def get_project_dir(project_id: str) -> Path:
    # Prevent path traversal and special characters
    if not project_id or not SAFE_PROJECT_ID_REGEX.match(project_id) or project_id in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    target = (settings.PROJECTS_DIR / project_id).resolve()
    base = settings.PROJECTS_DIR.resolve()
    if target.parent != base:
        raise HTTPException(status_code=400, detail="Invalid project ID traversal")
    return target

def init_project_directories(project_id: str) -> dict[str, Path]:
    base = get_project_dir(project_id)
    dirs = {
        "base": base,
        "source_images": base / "source_images",
        "processed_images": base / "processed_images",
        "feature_analysis": base / "feature_analysis",
        "colmap": base / "colmap",
        "colmap_database": base / "colmap" / "database.db",
        "colmap_sparse": base / "colmap" / "sparse",
        "colmap_dense": base / "colmap" / "dense",
        "point_clouds": base / "point_clouds",
        "meshes": base / "meshes",
        "exports": base / "exports",
        "logs": base / "logs",
    }
    for key, path in dirs.items():
        if key != "colmap_database":
            path.mkdir(parents=True, exist_ok=True)
    return dirs

def calculate_file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def is_allowed_file(filename: Optional[str]) -> bool:
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in settings.ALLOWED_EXTENSIONS

def get_relative_url(full_path: Path | str) -> str:
    """Converts a filesystem path to a web accessible /storage URL"""
    full_path_str = str(Path(full_path).resolve()).replace("\\", "/")
    storage_dir_str = str(settings.STORAGE_DIR.resolve()).replace("\\", "/")
    if full_path_str.startswith(storage_dir_str):
        rel = full_path_str[len(storage_dir_str):].lstrip("/")
        return f"/storage/{rel}"
    return full_path_str
