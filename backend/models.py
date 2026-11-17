import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="created")  # created, ready, reconstructing, completed, failed
    active_stage = Column(String(50), default="idle")  # idle, feature_extraction, matching, sfm, mvs, meshing, completed, error
    stage_progress = Column(Float, default=0.0)
    image_count = Column(Integer, default=0)
    registered_image_count = Column(Integer, default=0)
    sparse_point_count = Column(Integer, default=0)
    dense_point_count = Column(Integer, default=0)
    mesh_vertex_count = Column(Integer, default=0)
    mesh_triangle_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    images = relationship("ProjectImage", back_populates="project", cascade="all, delete-orphan")
    matches = relationship("FeatureMatch", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("ReconstructionLog", back_populates="project", cascade="all, delete-orphan")
    artifacts = relationship("ReconstructionArtifact", back_populates="project", cascade="all, delete-orphan")

class ProjectImage(Base):
    __tablename__ = "project_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    processed_path = Column(String(500), nullable=True)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    file_size = Column(Integer, default=0)
    format = Column(String(10), default="")
    avg_brightness = Column(Float, default=0.0)
    contrast = Column(Float, default=0.0)
    sharpness = Column(Float, default=0.0)
    is_blurry = Column(Boolean, default=False)
    is_dark = Column(Boolean, default=False)
    is_low_res = Column(Boolean, default=False)
    is_duplicate = Column(Boolean, default=False)
    warning_reason = Column(Text, nullable=True)
    keypoint_count = Column(Integer, default=0)
    file_hash = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="images")

class FeatureMatch(Base):
    __tablename__ = "feature_matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    image1_id = Column(String(36), nullable=False)
    image2_id = Column(String(36), nullable=False)
    image1_name = Column(String(255), nullable=False)
    image2_name = Column(String(255), nullable=False)
    total_matches = Column(Integer, default=0)
    inlier_matches = Column(Integer, default=0)
    visualization_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="matches")

class ReconstructionLog(Base):
    __tablename__ = "reconstruction_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    level = Column(String(10), default="INFO")
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="logs")

class ReconstructionArtifact(Base):
    __tablename__ = "reconstruction_artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    artifact_type = Column(String(50), nullable=False)  # sparse_pcd, dense_pcd, cleaned_pcd, poisson_mesh, simplified_mesh, camera_poses
    file_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    format = Column(String(10), nullable=False)  # ply, obj, glb, json
    file_size = Column(Integer, default=0)
    point_count = Column(Integer, nullable=True)
    vertex_count = Column(Integer, nullable=True)
    triangle_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="artifacts")
