import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import engine, Base
from backend.routers import (
    projects,
    images,
    analysis,
    features,
    reconstruct,
    models_3d,
    websocket
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="3D Object Reconstruction from Multiple 2D Images using SfM and MVS",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount storage directory for static file access (images, point clouds, meshes)
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include Routers
app.include_router(projects.router)
app.include_router(images.router)
app.include_router(analysis.router)
app.include_router(features.router)
app.include_router(reconstruct.router)
app.include_router(models_3d.router)
app.include_router(websocket.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "colmap_available": os.path.exists(settings.COLMAP_PATH),
        "colmap_path": settings.COLMAP_PATH,
        "storage_dir": str(settings.STORAGE_DIR)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
