import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PROJECTS_DIR = STORAGE_DIR / "projects"
TOOLS_DIR = BASE_DIR / "tools"
DEFAULT_COLMAP_BAT = TOOLS_DIR / "colmap" / "COLMAP.bat"
DEFAULT_COLMAP_EXE = TOOLS_DIR / "colmap" / "bin" / "colmap.exe"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Reconstruct3D"
    API_PREFIX: str = "/api"
    STORAGE_DIR: Path = STORAGE_DIR
    PROJECTS_DIR: Path = PROJECTS_DIR
    DATABASE_URL: str = f"sqlite:///{STORAGE_DIR / 'reconstruct3d.db'}"
    COLMAP_PATH: str = os.getenv("COLMAP_PATH", str(DEFAULT_COLMAP_BAT if DEFAULT_COLMAP_BAT.exists() else "colmap"))
    MAX_IMAGE_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "webp"}
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure base directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
