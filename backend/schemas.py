from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime
from typing import Any, Optional, List
from backend.services.file_service import get_relative_url

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None

class ImageQualityMetrics(BaseModel):
    width: int
    height: int
    file_size: int
    format: str
    avg_brightness: float
    contrast: float
    sharpness: float
    is_blurry: bool
    is_dark: bool
    is_low_res: bool
    is_duplicate: bool = False
    warning_reason: Optional[str] = None
    keypoint_count: int = 0

class ProjectImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    filename: str
    original_filename: str
    file_path: str
    processed_path: Optional[str] = None
    width: int
    height: int
    file_size: int
    format: str
    avg_brightness: float
    contrast: float
    sharpness: float
    is_blurry: bool
    is_dark: bool
    is_low_res: bool
    is_duplicate: bool
    warning_reason: Optional[str] = None
    keypoint_count: int
    uploaded_at: datetime

class FeatureMatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    image1_id: str
    image2_id: str
    image1_name: str
    image2_name: str
    total_matches: int
    inlier_matches: int
    visualization_path: Optional[str] = None
    created_at: datetime

class FeatureExtractionRequest(BaseModel):
    image1_id: Optional[str] = None
    image2_id: Optional[str] = None
    n_features: int = Field(default=2000, ge=100, le=20000)

class ReconstructionLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: str
    stage: str
    message: str
    level: str
    timestamp: datetime

class ReconstructionArtifactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    artifact_type: str
    file_path: str
    filename: str
    format: str
    file_size: int
    point_count: Optional[int] = None
    vertex_count: Optional[int] = None
    triangle_count: Optional[int] = None
    created_at: datetime

    @field_validator("file_path", mode="before")
    @classmethod
    def normalize_file_path(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.startswith("/storage/"):
            return get_relative_url(value)
        return value

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    status: str
    active_stage: str
    stage_progress: float
    image_count: int
    registered_image_count: int
    sparse_point_count: int
    dense_point_count: int
    mesh_vertex_count: int
    mesh_triangle_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ProjectDetailResponse(ProjectResponse):
    images: List[ProjectImageResponse] = Field(default_factory=list)
    artifacts: List[ReconstructionArtifactResponse] = Field(default_factory=list)

class ReconstructionStartRequest(BaseModel):
    quality: str = "medium"  # low, medium, high
    run_dense: bool = True
    run_mesh: bool = True
    voxel_size: Optional[float] = Field(default=None, gt=0)
    poisson_depth: int = Field(default=9, ge=4, le=12)
    decimation_triangles: int = Field(default=50000, ge=100, le=500000)

class PointCloudStats(BaseModel):
    point_count: int
    has_normals: bool
    has_colors: bool
    bounds_min: List[float]
    bounds_max: List[float]
    center: List[float]

class MeshStats(BaseModel):
    vertex_count: int
    triangle_count: int
    has_vertex_normals: bool
    has_vertex_colors: bool
    bounds_min: List[float]
    bounds_max: List[float]
