import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = BASE_DIR / "storage"
PROJECTS_DIR = STORAGE_DIR / "projects"
TOOLS_DIR = BASE_DIR / "tools"
SETTINGS_JSON_PATH = DATA_DIR / "settings.json"
DEFAULT_COLMAP_BAT = TOOLS_DIR / "colmap" / "COLMAP.bat"
DEFAULT_COLMAP_EXE = TOOLS_DIR / "colmap" / "bin" / "colmap.exe"

def load_dynamic_settings() -> Dict[str, Any]:
    if SETTINGS_JSON_PATH.exists():
        try:
            with open(SETTINGS_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_dynamic_settings(updates: Dict[str, Any]) -> Dict[str, Any]:
    current = load_dynamic_settings()
    current.update(updates)
    SETTINGS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2)

    # Sync to .env file if meshy_api_key, hf_token, or gemini_api_key was updated
    env_keys = {"meshy_api_key": "MESHY_API_KEY", "hf_token": "HF_TOKEN", "gemini_api_key": "GEMINI_API_KEY"}
    env_path = BASE_DIR / ".env"
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as ef:
                lines = ef.readlines()
            for dyn_k, env_k in env_keys.items():
                if dyn_k in updates:
                    new_val = updates[dyn_k]
                    replaced = False
                    new_lines = []
                    for line in lines:
                        if line.startswith(f"{env_k}="):
                            new_lines.append(f"{env_k}={new_val}\n")
                            replaced = True
                        else:
                            new_lines.append(line)
                    if not replaced:
                        new_lines.append(f"\n{env_k}={new_val}\n")
                    lines = new_lines
            with open(env_path, "w", encoding="utf-8") as ef:
                ef.writelines(lines)
        except Exception:
            pass
    return current

class Settings(BaseSettings):
    PROJECT_NAME: str = "Reconstruct3D"
    API_PREFIX: str = "/api"
    DATA_DIR: Path = DATA_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    PROJECTS_DIR: Path = PROJECTS_DIR
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'reconstruct3d.db'}")
    COLMAP_PATH: str = os.getenv("COLMAP_PATH", str(DEFAULT_COLMAP_BAT if DEFAULT_COLMAP_BAT.exists() else "colmap"))
    MESHY_API_KEY: Optional[str] = os.getenv("MESHY_API_KEY", "")
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    MAX_IMAGE_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: set[str] = {"jpg", "jpeg", "png", "webp"}
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

settings = Settings()

# Ensure base directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
