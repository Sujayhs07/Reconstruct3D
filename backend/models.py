"""
SQLAlchemy ORM Database Models
------------------------------
Why this matters:
These models define the relational schema for the 3D reconstruction platform.
They track every step of the photogrammetry lifecycle:
- Project: Root container tracking state machine, stage progress, point/triangle counts.
- ProjectImage: Uploaded photographs with computer vision quality metrics (Laplacian blur,
  brightness, contrast, SIFT keypoints) and SHA-256 hash for duplicate suppression.
- FeatureMatch: Pairwise epipolar matching results and RANSAC inliers between image pairs.
- ReconstructionLog: Live execution logs streamed over WebSocket to the web terminal.
- ReconstructionArtifact: Generated 3D point clouds (PLY), surface meshes (OBJ/PLY),
  textured models (GLB), and camera poses (JSON).
- AppSettings: Dynamic hardware parameters (CPU thread caps, RAM limits) and cloud API keys.

Database Optimization:
Foreign keys (project_id) have explicit `index=True` so lookups by project are indexed in B-trees
rather than requiring full table scans as dataset sizes grow.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

def generate_uuid() -> str:
    """Generates a random UUID4 string for primary keys."""
    return str(uuid.uuid4())

def utc_now() -> datetime:
    """Returns current UTC timestamp with timezone awareness."""
    return datetime.now(timezone.utc)

class Project(Base):
    """
    Represents an independent 3D reconstruction project workspace.
    Maintains high-level pipeline status and aggregate statistics (counts of points/triangles).
    """
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="created")  # created, ready, reconstructing, completed, failed
    active_stage: Mapped[str] = mapped_column(String(50), default="idle")  # idle, feature_extraction, matching, sfm, mvs, meshing, completed, error
    stage_progress: Mapped[float] = mapped_column(Float, default=0.0)  # Progress within current stage (0.0 to 1.0)
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    registered_image_count: Mapped[int] = mapped_column(Integer, default=0)  # Images successfully placed by SfM
    sparse_point_count: Mapped[int] = mapped_column(Integer, default=0)
    dense_point_count: Mapped[int] = mapped_column(Integer, default=0)
    mesh_vertex_count: Mapped[int] = mapped_column(Integer, default=0)
    mesh_triangle_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships - cascading deletes ensure child records and logs are purged when project is deleted
    images: Mapped[List["ProjectImage"]] = relationship("ProjectImage", back_populates="project", cascade="all, delete-orphan")
    matches: Mapped[List["FeatureMatch"]] = relationship("FeatureMatch", back_populates="project", cascade="all, delete-orphan")
    logs: Mapped[List["ReconstructionLog"]] = relationship("ReconstructionLog", back_populates="project", cascade="all, delete-orphan")
    artifacts: Mapped[List["ReconstructionArtifact"]] = relationship("ReconstructionArtifact", back_populates="project", cascade="all, delete-orphan")

class ProjectImage(Base):
    """
    Represents an individual photo uploaded to a project.
    Stores metadata and computer vision quality checks (blur, illumination, resolution).
    """
    __tablename__ = "project_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    processed_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    format: Mapped[str] = mapped_column(String(10), default="")
    # Quality metrics used to warn users if photos might hurt 3D reconstruction quality
    avg_brightness: Mapped[float] = mapped_column(Float, default=0.0)
    contrast: Mapped[float] = mapped_column(Float, default=0.0)
    sharpness: Mapped[float] = mapped_column(Float, default=0.0)  # Laplacian variance (higher = crisper edges)
    is_blurry: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dark: Mapped[bool] = mapped_column(Boolean, default=False)
    is_low_res: Mapped[bool] = mapped_column(Boolean, default=False)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    warning_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keypoint_count: Mapped[int] = mapped_column(Integer, default=0)  # Number of SIFT feature points detected
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256 checksum for deduplication
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="images")

class FeatureMatch(Base):
    """
    Stores pairwise feature matching and RANSAC epipolar verification results.
    Enables users to visually inspect overlapping feature points between any two camera perspectives.
    """
    __tablename__ = "feature_matches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    image1_id: Mapped[str] = mapped_column(String(36), nullable=False)
    image2_id: Mapped[str] = mapped_column(String(36), nullable=False)
    image1_name: Mapped[str] = mapped_column(String(255), nullable=False)
    image2_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_matches: Mapped[int] = mapped_column(Integer, default=0)
    inlier_matches: Mapped[int] = mapped_column(Integer, default=0)  # Matches satisfying epipolar Fundamental Matrix
    visualization_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="matches")

class ReconstructionLog(Base):
    """
    Persistent log entries for the reconstruction lifecycle.
    Persisted to DB and broadcast simultaneously via WebSockets to the web console terminal.
    """
    __tablename__ = "reconstruction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "feature_extraction", "sfm", "meshing"
    message: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(10), default="INFO")  # INFO, WARNING, ERROR, SUCCESS
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="logs")

class ReconstructionArtifact(Base):
    """
    Generated 3D output files stored on disk and served to the Three.js viewer or exported.
    Examples: sparse_pcd, dense_pcd, poisson_mesh, simplified_mesh, glb_mesh, camera_poses.
    """
    __tablename__ = "reconstruction_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)  # ply, obj, glb, json
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    point_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vertex_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    triangle_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="artifacts")
