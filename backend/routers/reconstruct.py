import json
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Project, ReconstructionLog
from backend.schemas import ReconstructionStartRequest, ReconstructionLogResponse
from backend.services.job_manager import job_manager
from backend.services.colmap_service import ColmapService
from backend.services.file_service import init_project_directories

router = APIRouter(prefix="/api/projects/{project_id}", tags=["reconstruction"])

@router.post("/reconstruct", status_code=status.HTTP_202_ACCEPTED)
def start_reconstruction(
    project_id: str,
    req: ReconstructionStartRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.image_count < 2:
        raise HTTPException(status_code=400, detail="Reconstruction requires at least 2 images.")

    if job_manager.is_running(project_id):
        raise HTTPException(status_code=409, detail="Reconstruction is already running for this project.")

    try:
        job_manager.start_reconstruction(
            project_id=project_id,
            run_dense=req.run_dense,
            run_mesh=req.run_mesh,
            poisson_depth=req.poisson_depth,
            decimation_triangles=req.decimation_triangles
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start reconstruction: {str(e)}")

    return {"message": "Reconstruction pipeline started", "project_id": project_id}

@router.post("/cancel", status_code=status.HTTP_200_OK)
def cancel_reconstruction(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not job_manager.is_running(project_id):
        return {"message": "No active reconstruction job to cancel."}

    success = job_manager.cancel_job(project_id)
    return {"message": "Cancellation requested", "success": success}

@router.get("/status")
def get_reconstruction_status(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_running = job_manager.is_running(project_id)

    return {
        "project_id": project_id,
        "is_running": is_running,
        "status": project.status,
        "active_stage": project.active_stage,
        "stage_progress": project.stage_progress,
        "image_count": project.image_count,
        "registered_image_count": project.registered_image_count,
        "sparse_point_count": project.sparse_point_count,
        "dense_point_count": project.dense_point_count,
        "mesh_vertex_count": project.mesh_vertex_count,
        "mesh_triangle_count": project.mesh_triangle_count,
        "error_message": project.error_message
    }

@router.get("/logs", response_model=List[ReconstructionLogResponse])
def get_reconstruction_logs(
    project_id: str,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    logs = (
        db.query(ReconstructionLog)
        .filter(ReconstructionLog.project_id == project_id)
        .order_by(ReconstructionLog.id.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(logs))

@router.get("/camera_poses")
def get_camera_poses(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    dirs = init_project_directories(project_id)
    txt_dir = dirs["colmap_sparse"] / "txt"

    if not txt_dir.exists():
        return {"camera_poses": [], "registered_images": []}

    colmap_svc = ColmapService()
    summary = colmap_svc.parse_reconstruction_summary(txt_dir)
    return summary
