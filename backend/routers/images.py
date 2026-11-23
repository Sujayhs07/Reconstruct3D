import os
import gc
import uuid
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Project, ProjectImage
from backend.schemas import ProjectImageResponse
from backend.config import settings
from backend.services.cv_service import CVService
from backend.services.file_service import (
    init_project_directories,
    calculate_file_hash,
    is_allowed_file,
    get_relative_url
)

router = APIRouter(prefix="/api/projects/{project_id}/images", tags=["images"])

@router.post("", response_model=List[ProjectImageResponse], status_code=status.HTTP_201_CREATED)
def upload_images(
    project_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dirs = init_project_directories(project_id)
    uploaded_images: List[ProjectImage] = []

    # Retrieve existing hashes in this project for duplicate detection
    existing_hashes = {
        img.file_hash for img in db.query(ProjectImage.file_hash).filter(ProjectImage.project_id == project_id).all()
    }

    max_size_bytes = settings.MAX_IMAGE_UPLOAD_SIZE_MB * 1024 * 1024

    for file in files:
        filename = file.filename
        if not filename or not is_allowed_file(filename):
            continue

        safe_filename = os.path.basename(filename)
        ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else "jpg"
        unique_name = f"{uuid.uuid4().hex[:12]}_{safe_filename}"
        dest_path = dirs["source_images"] / unique_name

        hasher = hashlib.sha256()
        file_size = 0

        # Stream chunks directly to disk while computing SHA-256 hash.
        # This keeps RAM overhead at <64KB instead of loading full multi-megabyte files into memory.
        try:
            with open(dest_path, "wb") as f:
                while True:
                    chunk = file.file.read(65536)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > max_size_bytes:
                        raise HTTPException(
                            status_code=400,
                            detail=f"File {safe_filename} exceeds the maximum allowed size of {settings.MAX_IMAGE_UPLOAD_SIZE_MB}MB."
                        )
                    hasher.update(chunk)
                    f.write(chunk)
        except HTTPException:
            if dest_path.exists():
                try:
                    dest_path.unlink()
                except Exception:
                    pass
            raise
        except Exception as e:
            if dest_path.exists():
                try:
                    dest_path.unlink()
                except Exception:
                    pass
            raise HTTPException(status_code=400, detail=f"Failed to save upload {safe_filename}: {str(e)}")

        if file_size == 0:
            if dest_path.exists():
                try:
                    dest_path.unlink()
                except Exception:
                    pass
            continue

        file_hash = hasher.hexdigest()
        is_duplicate = file_hash in existing_hashes

        # Analyze image quality from saved file using downsampled preview to protect 512MB RAM cap
        try:
            analysis = CVService.analyze_image_quality(dest_path, safe_filename)
        except Exception as e:
            if dest_path.exists():
                try:
                    dest_path.unlink()
                except Exception:
                    pass
            raise HTTPException(status_code=400, detail=f"Image validation failed for {safe_filename}: {str(e)}")

        analysis["is_duplicate"] = is_duplicate
        if is_duplicate:
            warning = "Duplicate image detected."
            if analysis.get("warning_reason"):
                analysis["warning_reason"] += f" | {warning}"
            else:
                analysis["warning_reason"] = warning

        # Count SIFT keypoints with downscaling preview to keep memory < 20MB
        try:
            _, _, kp_count = CVService.extract_sift_features(dest_path, n_features=2000, max_dimension=1200)
        except Exception:
            kp_count = 0

        # Store relative accessible URL for frontend
        rel_url = get_relative_url(dest_path)

        img_obj = ProjectImage(
            project_id=project_id,
            filename=unique_name,
            original_filename=safe_filename,
            file_path=rel_url,
            width=analysis.get("width", 0),
            height=analysis.get("height", 0),
            file_size=analysis.get("file_size", file_size),
            format=analysis.get("format", ext),
            avg_brightness=analysis.get("avg_brightness", 0.0),
            contrast=analysis.get("contrast", 0.0),
            sharpness=analysis.get("sharpness", 0.0),
            is_blurry=analysis.get("is_blurry", False),
            is_dark=analysis.get("is_dark", False),
            is_low_res=analysis.get("is_low_res", False),
            is_duplicate=is_duplicate,
            warning_reason=analysis.get("warning_reason"),
            keypoint_count=kp_count,
            file_hash=file_hash
        )
        db.add(img_obj)
        uploaded_images.append(img_obj)
        existing_hashes.add(file_hash)

        # Force immediate garbage collection of any lingering OpenCV buffers
        del analysis
        gc.collect()

    if not uploaded_images:
        raise HTTPException(
            status_code=400,
            detail="No supported image files provided. Allowed formats: jpg, jpeg, png, webp."
        )

    db.commit()

    # Update project image count and status
    total_imgs = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).count()
    project.image_count = total_imgs
    if project.status == "created" and project.image_count > 0:
        project.status = "ready"
    db.commit()

    for img in uploaded_images:
        db.refresh(img)

    return uploaded_images

@router.get("", response_model=List[ProjectImageResponse])
def get_project_images(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    images = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).order_by(ProjectImage.uploaded_at.asc()).all()
    return images

@router.delete("/{image_id}", status_code=status.HTTP_200_OK)
def delete_image(project_id: str, image_id: str, db: Session = Depends(get_db)):
    img = db.query(ProjectImage).filter(ProjectImage.id == image_id, ProjectImage.project_id == project_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete physical file
    dirs = init_project_directories(project_id)
    phys_path = dirs["source_images"] / img.filename
    if phys_path.exists():
        try:
            phys_path.unlink()
        except Exception:
            pass

    proc_path = dirs["processed_images"] / img.filename
    if proc_path.exists():
        try:
            proc_path.unlink()
        except Exception:
            pass

    db.delete(img)
    db.flush()
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.image_count = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).count()
        if project.image_count == 0 and project.status == "ready":
            project.status = "created"
    db.commit()

    return {"message": "Image deleted successfully", "id": image_id}
