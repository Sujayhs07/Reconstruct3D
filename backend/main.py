import os
import shutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings, BASE_DIR
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

# Initialize SQLite database schema
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
        "colmap_available": bool(os.path.exists(settings.COLMAP_PATH) or shutil.which(settings.COLMAP_PATH)),
        "colmap_path": settings.COLMAP_PATH,
        "storage_dir": str(settings.STORAGE_DIR)
    }

# Mount React production build if available (enables single-server deployment with SPA routing)
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "storage/", "ws/")):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (frontend_dist / full_path).resolve()
        dist_root = frontend_dist.resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(dist_root):
            return FileResponse(str(candidate))
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        raise HTTPException(status_code=404, detail="Frontend build not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
