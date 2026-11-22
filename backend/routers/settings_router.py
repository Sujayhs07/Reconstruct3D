from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.config import settings, load_dynamic_settings, save_dynamic_settings
from backend.services.cloud_3d_service import Meshy3DService, HFTripoSRService

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsUpdateRequest(BaseModel):
    meshy_api_key: Optional[str] = None
    hf_token: Optional[str] = None
    engine_preference: Optional[str] = "auto"

@router.get("")
def get_settings():
    dyn = load_dynamic_settings()
    meshy_key = dyn.get("meshy_api_key") or settings.MESHY_API_KEY or ""
    hf_tok = dyn.get("hf_token") or settings.HF_TOKEN or ""
    masked_meshy = f"{meshy_key[:4]}...{meshy_key[-4:]}" if len(meshy_key) >= 8 else ("****" if meshy_key else "")
    return {
        "meshy_api_key_configured": bool(meshy_key),
        "meshy_api_key_masked": masked_meshy,
        "hf_token_configured": bool(hf_tok),
        "engine_preference": dyn.get("engine_preference", "auto"),
        "free_cloud_engine": "Hugging Face Spaces (TripoSR / Free)",
        "monthly_cloud_engine": "Meshy.ai (200 Free Credits/mo)",
        "offline_engine": "16-core Intel CPU Offline Engine (100% Free)"
    }

@router.post("")
def update_settings(req: SettingsUpdateRequest):
    updates = {}
    if req.meshy_api_key is not None:
        key_clean = req.meshy_api_key.strip()
        updates["meshy_api_key"] = key_clean
        settings.MESHY_API_KEY = key_clean

    if req.hf_token is not None:
        tok_clean = req.hf_token.strip()
        updates["hf_token"] = tok_clean
        settings.HF_TOKEN = tok_clean

    if req.engine_preference is not None:
        updates["engine_preference"] = req.engine_preference

    saved = save_dynamic_settings(updates)
    return {
        "message": "Settings updated successfully",
        "meshy_api_key_configured": bool(saved.get("meshy_api_key")),
        "hf_token_configured": bool(saved.get("hf_token")),
        "engine_preference": saved.get("engine_preference", "auto")
    }

@router.post("/test-meshy")
def test_meshy_balance():
    return Meshy3DService.get_balance()
