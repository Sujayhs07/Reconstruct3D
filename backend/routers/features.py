import uuid
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Project, ProjectImage, FeatureMatch
from backend.schemas import FeatureMatchResponse, FeatureExtractionRequest
from backend.services.cv_service import CVService
from backend.services.file_service import init_project_directories, get_relative_url

router = APIRouter(prefix="/api/projects/{project_id}/features", tags=["features"])

@router.post("", response_model=FeatureMatchResponse, status_code=status.HTTP_201_CREATED)
def match_project_features(
    project_id: str,
    req: FeatureExtractionRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dirs = init_project_directories(project_id)
    images = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).order_by(ProjectImage.uploaded_at.asc()).all()
    if len(images) < 2:
        raise HTTPException(status_code=400, detail="Feature matching requires at least 2 images.")

    # Select target images
    img1 = None
    img2 = None
    if req.image1_id and req.image2_id:
        img1 = next((i for i in images if i.id == req.image1_id), None)
        img2 = next((i for i in images if i.id == req.image2_id), None)
    if not img1 or not img2:
        img1 = images[0]
        img2 = images[1]

    path1 = dirs["source_images"] / img1.filename
    path2 = dirs["source_images"] / img2.filename

    if not path1.exists() or not path2.exists():
        raise HTTPException(status_code=400, detail="Source image files not found on disk.")

    vis_filename = f"match_{img1.id[:6]}_{img2.id[:6]}_{uuid.uuid4().hex[:6]}.jpg"
    vis_path = dirs["feature_analysis"] / vis_filename

    # Execute SIFT matching with Lowe's ratio test and RANSAC epipolar geometric verification
    res = CVService.match_features_and_verify(
        img1_path=path1,
        img2_path=path2,
        output_vis_path=vis_path,
        n_features=req.n_features
    )

    vis_url = get_relative_url(vis_path) if vis_path.exists() else None

    match_record = FeatureMatch(
        project_id=project_id,
        image1_id=img1.id,
        image2_id=img2.id,
        image1_name=img1.original_filename,
        image2_name=img2.original_filename,
        total_matches=res["total_matches"],
        inlier_matches=res["inlier_matches"],
        visualization_path=vis_url
    )
    db.add(match_record)
    db.commit()
    db.refresh(match_record)

    return match_record

@router.get("", response_model=List[FeatureMatchResponse])
def get_feature_matches(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    matches = db.query(FeatureMatch).filter(FeatureMatch.project_id == project_id).order_by(FeatureMatch.created_at.desc()).all()
    return matches
