import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from backend.database import get_db
from backend.models import Project, ProjectImage, ReconstructionArtifact
from backend.schemas import ProjectCreate, ProjectResponse, ProjectDetailResponse
from backend.services.file_service import init_project_directories, get_project_dir, SAFE_PROJECT_ID_REGEX
from backend.config import settings

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        status="created",
        active_stage="idle"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Initialize directory structure on disk
    init_project_directories(project.id)
    return project

@router.get("", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return projects

@router.get("/stats/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    completed_projects = db.query(func.count(Project.id)).filter(Project.status == "completed").scalar() or 0
    total_images = db.query(func.count(ProjectImage.id)).scalar() or 0
    total_points = (
        db.query(
            func.sum(
                case(
                    (Project.dense_point_count > 0, Project.dense_point_count),
                    else_=Project.sparse_point_count
                )
            )
        ).scalar()
        or 0
    )
    total_meshes = (
        db.query(func.count(func.distinct(ReconstructionArtifact.project_id)))
        .filter(ReconstructionArtifact.artifact_type == "model_mesh")
        .scalar()
        or 0
    )

    return {
        "total_projects": total_projects,
        "completed_projects": completed_projects,
        "total_images": total_images,
        "total_reconstructed_points": int(total_points),
        "total_meshes_generated": total_meshes
    }

@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        # Check if project folder exists on disk (e.g. from prior runs before container reboot)
        if SAFE_PROJECT_ID_REGEX.match(project_id) and project_id not in {".", ".."}:
            target_dir = settings.PROJECTS_DIR / project_id
            if target_dir.exists():
                dirs = init_project_directories(project_id)
                n_imgs = len(list(dirs["source_images"].glob("*.*"))) if dirs["source_images"].exists() else 0
                project = Project(
                    id=project_id,
                    name=f"Project {project_id[:8]}",
                    description="Restored photogrammetry project",
                    status="ready" if n_imgs > 0 else "created",
                    image_count=n_imgs
                )
                db.add(project)
                db.commit()
                db.refresh(project)
                return project
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()

    # Remove storage folder from disk
    try:
        p_dir = get_project_dir(project_id)
        if p_dir.exists():
            shutil.rmtree(p_dir, ignore_errors=True)
    except Exception:
        pass

    return {"message": "Project deleted successfully", "id": project_id}
