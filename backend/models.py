import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="created")  # created, ready, reconstructing, completed, failed
    active_stage: Mapped[str] = mapped_column(String(50), default="idle")  # idle, feature_extraction, matching, sfm, mvs, meshing, completed, error
    stage_progress: Mapped[float] = mapped_column(Float, default=0.0)
    image_count: Mapped[int] = mapped_column(Integer, default=0)
    registered_image_count: Mapped[int] = mapped_column(Integer, default=0)
    sparse_point_count: Mapped[int] = mapped_column(Integer, default=0)
    dense_point_count: Mapped[int] = mapped_column(Integer, default=0)
    mesh_vertex_count: Mapped[int] = mapped_column(Integer, default=0)
    mesh_triangle_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    images: Mapped[List["ProjectImage"]] = relationship("ProjectImage", back_populates="project", cascade="all, delete-orphan")
    matches: Mapped[List["FeatureMatch"]] = relationship("FeatureMatch", back_populates="project", cascade="all, delete-orphan")
    logs: Mapped[List["ReconstructionLog"]] = relationship("ReconstructionLog", back_populates="project", cascade="all, delete-orphan")
    artifacts: Mapped[List["ReconstructionArtifact"]] = relationship("ReconstructionArtifact", back_populates="project", cascade="all, delete-orphan")

class ProjectImage(Base):
    __tablename__ = "project_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    processed_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    format: Mapped[str] = mapped_column(String(10), default="")
    avg_brightness: Mapped[float] = mapped_column(Float, default=0.0)
    contrast: Mapped[float] = mapped_column(Float, default=0.0)
    sharpness: Mapped[float] = mapped_column(Float, default=0.0)
    is_blurry: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dark: Mapped[bool] = mapped_column(Boolean, default=False)
    is_low_res: Mapped[bool] = mapped_column(Boolean, default=False)
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    warning_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    keypoint_count: Mapped[int] = mapped_column(Integer, default=0)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="images")

class FeatureMatch(Base):
    __tablename__ = "feature_matches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    image1_id: Mapped[str] = mapped_column(String(36), nullable=False)
    image2_id: Mapped[str] = mapped_column(String(36), nullable=False)
    image1_name: Mapped[str] = mapped_column(String(255), nullable=False)
    image2_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_matches: Mapped[int] = mapped_column(Integer, default=0)
    inlier_matches: Mapped[int] = mapped_column(Integer, default=0)
    visualization_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="matches")

class ReconstructionLog(Base):
    __tablename__ = "reconstruction_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    level: Mapped[str] = mapped_column(String(10), default="INFO")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="logs")

class ReconstructionArtifact(Base):
    __tablename__ = "reconstruction_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    artifact_type: Mapped[str] = mapped_column(String(50), nullable=False)  # sparse_pcd, dense_pcd, cleaned_pcd, poisson_mesh, simplified_mesh, camera_poses
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)  # ply, obj, glb, json
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    point_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vertex_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    triangle_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    project: Mapped["Project"] = relationship("Project", back_populates="artifacts")
