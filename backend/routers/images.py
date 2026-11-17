import os
import uuid
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
async def upload_images(
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
        if not is_allowed_file(file.filename):
            continue

        contents = await file.read()
        if len(contents) > max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} exceeds the maximum allowed size of {settings.MAX_IMAGE_UPLOAD_SIZE_MB}MB."
            )

        file_hash = calculate_file_hash(contents)
        is_duplicate = file_hash in existing_hashes

        # Analyze image quality with OpenCV
        try:
            analysis = CVService.analyze_image_quality(contents, file.filename)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image validation failed for {file.filename}: {str(e)}")

        if is_duplicate:
            analysis["is_duplicate"] = True
            warning = "Duplicate image detected."
            if analysis["warning_reason"]:
                analysis["warning_reason"] += f" | {warning}"
            else:
                analysis["warning_reason"] = warning

        # Generate unique filename to avoid collisions
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        unique_name = f"{uuid.uuid4().hex[:12]}_{file.filename}"
        dest_path = dirs["source_images"] / unique_name

        with open(dest_path, "wb") as f:
            f.write(contents)

        # Count SIFT keypoints
        try:
            _, _, kp_count = CVService.extract_sift_features(dest_path, n_features=2000)
        except Exception:
            kp_count = 0

        # Store relative accessible URL for frontend
        rel_url = get_relative_url(dest_path)

        img_obj = ProjectImage(
            project_id=project_id,
            filename=unique_name,
            original_filename=file.filename,
            file_path=rel_url,
            width=analysis["width"],
            height=analysis["height"],
            file_size=analysis["file_size"],
            format=analysis["format"],
            avg_brightness=analysis["avg_brightness"],
            contrast=analysis["contrast"],
            sharpness=analysis["sharpness"],
            is_blurry=analysis["is_blurry"],
            is_dark=analysis["is_dark"],
            is_low_res=analysis["is_low_res"],
            is_duplicate=analysis["is_duplicate"],
            warning_reason=analysis["warning_reason"],
            keypoint_count=kp_count,
            file_hash=file_hash
        )
        db.add(img_obj)
        uploaded_images.append(img_obj)
        existing_hashes.add(file_hash)

    # Update project image count and status
    project.image_count = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).count() + len(uploaded_images)
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
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        project.image_count = max(0, project.image_count - 1)
        if project.image_count == 0 and project.status == "ready":
            project.status = "created"
    db.commit()

    return {"message": "Image deleted successfully", "id": image_id}
