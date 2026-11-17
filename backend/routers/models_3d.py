from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Project, ReconstructionArtifact
from backend.schemas import ReconstructionArtifactResponse
from backend.services.file_service import init_project_directories, get_relative_url
from backend.services.open3d_service import Open3DService

router = APIRouter(prefix="/api/projects/{project_id}/models", tags=["3d_models"])

@router.get("", response_model=List[ReconstructionArtifactResponse])
def list_models_and_pointclouds(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    artifacts = (
        db.query(ReconstructionArtifact)
        .filter(ReconstructionArtifact.project_id == project_id)
        .order_by(ReconstructionArtifact.created_at.desc())
        .all()
    )

    # Convert absolute paths to relative web URLs for response
    for art in artifacts:
        art.file_path = get_relative_url(art.file_path)

    return artifacts

@router.get("/download/{filename}")
def download_model_file(project_id: str, filename: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dirs = init_project_directories(project_id)
    # Search in exports, meshes, point_clouds
    for search_dir in [dirs["exports"], dirs["meshes"], dirs["point_clouds"]]:
        candidate = search_dir / filename
        if candidate.exists():
            return FileResponse(
                path=str(candidate),
                filename=filename,
                media_type="application/octet-stream"
            )

    raise HTTPException(status_code=404, detail=f"Model file {filename} not found.")

@router.get("/stats")
def get_model_geometry_stats(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dirs = init_project_directories(project_id)
    mesh_path = dirs["meshes"] / "reconstructed_mesh.ply"
    pcd_path = dirs["point_clouds"] / "cleaned_points.ply"
    if not pcd_path.exists():
        pcd_path = dirs["point_clouds"] / "sparse_points.ply"

    pcd_stats = None
    if pcd_path.exists():
        try:
            pcd = Open3DService.load_point_cloud(pcd_path)
            pcd_stats = Open3DService.get_point_cloud_stats(pcd)
        except Exception:
            pass

    return {
        "sparse_points": project.sparse_point_count,
        "dense_points": project.dense_point_count,
        "mesh_vertices": project.mesh_vertex_count,
        "mesh_triangles": project.mesh_triangle_count,
        "registered_images": project.registered_image_count,
        "point_cloud_stats": pcd_stats
    }
