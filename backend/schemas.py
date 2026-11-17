from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
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
    is_duplicate: bool
    warning_reason: Optional[str] = None
    keypoint_count: int = 0

class ProjectImageResponse(BaseModel):
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

    class Config:
        from_attributes = True

class FeatureMatchResponse(BaseModel):
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

    class Config:
        from_attributes = True

class FeatureExtractionRequest(BaseModel):
    image1_id: Optional[str] = None
    image2_id: Optional[str] = None
    n_features: int = 2000

class ReconstructionLogResponse(BaseModel):
    id: int
    project_id: str
    stage: str
    message: str
    level: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ReconstructionArtifactResponse(BaseModel):
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

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
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

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    images: List[ProjectImageResponse] = []
    artifacts: List[ReconstructionArtifactResponse] = []

class ReconstructionStartRequest(BaseModel):
    quality: str = "medium"  # low, medium, high
    run_dense: bool = True
    run_mesh: bool = True
    voxel_size: Optional[float] = None
    poisson_depth: int = 9
    decimation_triangles: int = 50000

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
