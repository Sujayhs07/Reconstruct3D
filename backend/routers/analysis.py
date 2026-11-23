from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Project, ProjectImage
from backend.services.file_service import get_project_dir
from backend.services.gemini_service import GeminiVisionService

router = APIRouter(prefix="/api/projects/{project_id}/analysis", tags=["analysis"])

@router.get("/coverage")
def get_project_angle_coverage(project_id: str, db: Session = Depends(get_db)):
    """
    Analyzes multi-view image set using Gemini Vision to assess 360° coverage,
    identify missing angles, and generate capture instructions.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    p_dir = get_project_dir(project_id)
    source_dir = p_dir / "source_images"
    image_paths = sorted([p for p in source_dir.glob("*.*") if p.is_file()]) if source_dir.exists() else []

    return GeminiVisionService.analyze_coverage_and_angles(image_paths)

@router.get("")
def get_project_image_analysis(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    images = db.query(ProjectImage).filter(ProjectImage.project_id == project_id).all()
    if not images:
        return {
            "total_images": 0,
            "blurry_count": 0,
            "dark_count": 0,
            "low_res_count": 0,
            "duplicate_count": 0,
            "avg_sharpness": 0.0,
            "avg_brightness": 0.0,
            "avg_keypoints": 0,
            "quality_rating": "N/A",
            "recommendations": ["Upload at least 3-10 overlapping photographs to begin analysis."]
        }

    total = len(images)
    blurry = sum(1 for img in images if img.is_blurry)
    dark = sum(1 for img in images if img.is_dark)
    low_res = sum(1 for img in images if img.is_low_res)
    duplicates = sum(1 for img in images if img.is_duplicate)

    sharpness_vals = [img.sharpness for img in images]
    brightness_vals = [img.avg_brightness for img in images]
    kp_vals = [img.keypoint_count for img in images]

    avg_sharpness = round(sum(sharpness_vals) / total, 2)
    avg_brightness = round(sum(brightness_vals) / total, 2)
    avg_keypoints = int(sum(kp_vals) / total)

    # Determine overall dataset readiness score
    issues_ratio = (blurry + dark + low_res + duplicates) / float(total * 4)
    if issues_ratio < 0.1 and total >= 5:
        rating = "Excellent"
    elif issues_ratio < 0.25 and total >= 3:
        rating = "Good"
    elif issues_ratio < 0.5:
        rating = "Fair"
    else:
        rating = "Poor"

    recommendations = []
    if total < 5:
        recommendations.append(f"Only {total} images uploaded. For complete 3D structure, 10-30 photographs taken in a 360-degree circle are recommended.")
    if blurry > 0:
        recommendations.append(f"{blurry} image(s) show low Laplacian sharpness. Consider re-capturing with steady hands or better focus.")
    if dark > 0:
        recommendations.append(f"{dark} image(s) have low illumination. Ensure even diffuse lighting across the object surface.")
    if duplicates > 0:
        recommendations.append(f"{duplicates} duplicate photograph(s) detected. Duplicates from identical viewpoints may cause triangulation ambiguity.")
    if avg_keypoints < 400:
        recommendations.append("Low average SIFT keypoints detected. Ensure the object has textured surface details rather than plain reflective planes.")

    if not recommendations:
        recommendations.append("Image set meets photogrammetry standards. Ready for Structure from Motion reconstruction.")

    return {
        "total_images": total,
        "blurry_count": blurry,
        "dark_count": dark,
        "low_res_count": low_res,
        "duplicate_count": duplicates,
        "avg_sharpness": avg_sharpness,
        "avg_brightness": avg_brightness,
        "avg_keypoints": avg_keypoints,
        "quality_rating": rating,
        "recommendations": recommendations,
        "sharpness_distribution": [
            {"filename": img.original_filename, "sharpness": img.sharpness, "is_blurry": img.is_blurry}
            for img in images
        ],
        "brightness_distribution": [
            {"filename": img.original_filename, "brightness": img.avg_brightness, "is_dark": img.is_dark}
            for img in images
        ]
    }
