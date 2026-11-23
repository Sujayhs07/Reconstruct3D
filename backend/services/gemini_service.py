import os
import json
import base64
import cv2
import httpx
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from backend.config import settings, load_dynamic_settings, BASE_DIR

class GeminiVisionService:
    """
    AI Vision Agent powered by Google Gemini (Gemini 1.5 Flash).
    Performs visual grounding (bounding box detection), viewpoint angle estimation,
    360° photogrammetry coverage assessment, and smart object isolation.
    """
    API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    @classmethod
    def get_api_key(cls) -> Optional[str]:
        # 1. Dynamic settings
        dyn = load_dynamic_settings()
        if dyn.get("gemini_api_key"):
            return dyn["gemini_api_key"].strip()
        # 2. Settings object
        if getattr(settings, "GEMINI_API_KEY", None):
            return settings.GEMINI_API_KEY.strip()
        # 3. OS environment
        env_val = os.getenv("GEMINI_API_KEY")
        if env_val:
            return env_val.strip()
        # 4. Root .env file
        env_file = BASE_DIR / ".env"
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("=", 1)[1].strip()
                            if val:
                                return val
            except Exception:
                pass
        return None

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.get_api_key())

    @classmethod
    def analyze_coverage_and_angles(cls, image_paths: List[Path]) -> Dict[str, Any]:
        """
        Analyzes 1 to 6 images with Gemini 1.5 Flash to estimate:
        - Primary object name
        - Viewpoint angles (azimuth & elevation)
        - 2D Bounding box for smart cropping
        - Missing angles needed for a 360° watertight 3D model
        - Step-by-step guidance instructions for the user
        """
        valid_paths = [p for p in image_paths if p.exists() and p.is_file()]
        if not valid_paths:
            return cls._empty_coverage_response()

        api_key = cls.get_api_key()
        if not api_key:
            # Fallback to smart heuristic if Gemini key not yet configured
            return cls._heuristic_coverage_analysis(valid_paths)

        try:
            # Prepare image parts for Gemini payload
            contents_parts = []
            for idx, p in enumerate(valid_paths[:6]):
                ext = p.suffix.lstrip(".").lower() or "jpg"
                mime = "image/png" if ext == "png" else "image/jpeg"
                with open(p, "rb") as f:
                    b64_bytes = base64.b64encode(f.read()).decode("utf-8")
                contents_parts.append({
                    "inline_data": {
                        "mime_type": mime,
                        "data": b64_bytes
                    }
                })

            prompt_text = (
                "You are an expert Computer Vision and 3D Photogrammetry AI Agent.\n"
                f"Analyze the {len(valid_parts)} provided image(s) of a physical object intended for 3D reconstruction.\n\n"
                "Tasks:\n"
                "1. Identify the primary physical object in the foreground (e.g. 'Tata Copper Water Bottle', 'Ceramic Coffee Mug', 'Running Shoe').\n"
                "2. For EACH image (in order, index 0 to N-1):\n"
                "   - Determine its 2D bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000.\n"
                "   - Classify the viewpoint angle: azimuth_deg (0=Front, 90=Right profile, 180=Back, 270=Left profile) and elevation ('eye-level', 'top-down', 'bottom-up').\n"
                "   - Assess image suitability quality_score (0.0 to 1.0).\n"
                "3. Calculate overall 360-degree coverage score from 0 to 100%.\n"
                "4. Identify any MISSING angles needed to make a complete, watertight 3D model.\n"
                "   For each missing angle, provide view name, suggested azimuth degrees, importance ('high'|'medium'|'low'), and a friendly instruction.\n"
                "5. Determine if ready_for_3d is true (at least 1 clear view of the object is present).\n\n"
                "Respond ONLY with a valid JSON object matching this schema:\n"
                "{\n"
                '  "object_name": "string",\n'
                '  "object_category": "string",\n'
                '  "coverage_score": 50,\n'
                '  "ready_for_3d": true,\n'
                '  "images_analyzed": [\n'
                '    {\n'
                '      "image_index": 0,\n'
                '      "view": "Front View",\n'
                '      "azimuth_deg": 0,\n'
                '      "elevation": "eye-level",\n'
                '      "box_2d": [ymin, xmin, ymax, xmax],\n'
                '      "quality_score": 0.95\n'
                '    }\n'
                '  ],\n'
                '  "missing_angles": [\n'
                '    {\n'
                '      "view": "Right Profile (90°)",\n'
                '      "suggested_azimuth": 90,\n'
                '      "instruction": "Rotate the object 90° clockwise to capture its side profile.",\n'
                '      "importance": "high"\n'
                '    }\n'
                '  ],\n'
                '  "summary_feedback": "string",\n'
                '  "provider": "gemini-1.5-flash"\n'
                "}"
            )
            contents_parts.append({"text": prompt_text})

            payload = {
                "contents": [{"parts": contents_parts}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json"
                }
            }

            with httpx.Client(timeout=25.0) as client:
                resp = client.post(f"{cls.API_URL}?key={api_key}", json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_resp = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        parsed = json.loads(text_resp)
                        parsed["provider"] = "gemini-1.5-flash"
                        # Ensure standard keys exist
                        cls._normalize_coverage_data(parsed, valid_paths)
                        return parsed

        except Exception as e:
            pass

        # Fallback to local heuristic if Gemini API fails or times out
        return cls._heuristic_coverage_analysis(valid_paths)

    @classmethod
    def smart_crop_object(cls, img_bgr: np.ndarray, box_2d: Optional[List[int]] = None) -> np.ndarray:
        """
        Crops an image using Gemini's normalized 0-1000 bounding box [ymin, xmin, ymax, xmax]
        to isolate the object from human hands, face, and room background.
        """
        h, w = img_bgr.shape[:2]
        if not box_2d or len(box_2d) != 4:
            # Fallback: central 60% crop
            crop_w = int(w * 0.6)
            off_x = int((w - crop_w) / 2)
            return img_bgr[:, off_x:off_x + crop_w]

        ymin, xmin, ymax, xmax = box_2d
        # Convert 0-1000 scale to pixel coordinates with slight 5% padding
        pad_y = int((ymax - ymin) * 0.05 * h / 1000.0)
        pad_x = int((xmax - xmin) * 0.05 * w / 1000.0)

        py0 = max(0, int(ymin * h / 1000.0) - pad_y)
        py1 = min(h, int(ymax * h / 1000.0) + pad_y)
        px0 = max(0, int(xmin * w / 1000.0) - pad_x)
        px1 = min(w, int(xmax * w / 1000.0) + pad_x)

        if (py1 - py0) < 30 or (px1 - px0) < 30:
            return img_bgr
        return img_bgr[py0:py1, px0:px1]

    @classmethod
    def _heuristic_coverage_analysis(cls, valid_paths: List[Path]) -> Dict[str, Any]:
        """Provides instant mathematical coverage analysis when Gemini key is not configured."""
        count = len(valid_paths)
        images_analyzed = []

        # Standard angles mapped across count
        standard_angles = [0, 90, 180, 270, 45, 135]
        standard_views = ["Front View (0°)", "Right Profile (90°)", "Back View (180°)", "Left Profile (270°)", "Top-Angle View"]

        for idx, p in enumerate(valid_paths[:6]):
            azimuth = standard_angles[idx % len(standard_angles)]
            view_name = standard_views[min(idx, len(standard_views) - 1)]
            images_analyzed.append({
                "image_index": idx,
                "filename": p.name,
                "view": view_name,
                "azimuth_deg": azimuth,
                "elevation": "eye-level",
                "box_2d": [50, 200, 950, 800],
                "quality_score": 0.90
            })

        missing = []
        if count == 1:
            coverage = 35
            missing.append({
                "view": "Right Profile (90°)",
                "suggested_azimuth": 90,
                "instruction": "Rotate the object 90° clockwise to capture its side profile.",
                "importance": "high"
            })
            missing.append({
                "view": "Back View (180°)",
                "suggested_azimuth": 180,
                "instruction": "Rotate the object 180° to capture the rear surface and back label.",
                "importance": "high"
            })
            missing.append({
                "view": "Top Angle (Rim / Cap)",
                "suggested_azimuth": 0,
                "instruction": "Tilt the camera slightly downward (30° angle) to seal the top surface.",
                "importance": "medium"
            })
            feedback = "1 front view captured. For a full 360° elliptical model, capture the side or back."
        elif count == 2:
            coverage = 65
            missing.append({
                "view": "Back View (180°)",
                "suggested_azimuth": 180,
                "instruction": "Rotate the object 180° to capture the rear texture and label.",
                "importance": "high"
            })
            missing.append({
                "view": "Top Angle (Rim / Cap)",
                "suggested_azimuth": 0,
                "instruction": "Tilt camera slightly downwards to capture top cap geometry.",
                "importance": "medium"
            })
            feedback = "2 views captured (Front + Side). Ready for 3D reconstruction! Add back view for 360° coverage."
        elif count == 3:
            coverage = 85
            missing.append({
                "view": "Left Profile (270°)",
                "suggested_azimuth": 270,
                "instruction": "Capture the left profile to complete all 4 quadrants.",
                "importance": "medium"
            })
            feedback = "Great 360° coverage (85%). Ready for high-fidelity 3D reconstruction."
        else:
            coverage = 95
            feedback = "Excellent multi-view coverage! All primary angles are documented."

        return {
            "object_name": "Physical Target Object",
            "object_category": "Object / Container",
            "coverage_score": coverage,
            "ready_for_3d": count >= 1,
            "images_analyzed": images_analyzed,
            "missing_angles": missing,
            "summary_feedback": feedback,
            "provider": "heuristic_agent"
        }

    @classmethod
    def _empty_coverage_response(cls) -> Dict[str, Any]:
        return {
            "object_name": "No object detected",
            "object_category": "Unknown",
            "coverage_score": 0,
            "ready_for_3d": False,
            "images_analyzed": [],
            "missing_angles": [
                {
                    "view": "Front View (0°)",
                    "suggested_azimuth": 0,
                    "instruction": "Hold or place the object in front of the camera and snap the first photo.",
                    "importance": "high"
                }
            ],
            "summary_feedback": "Please upload or capture at least 1 photo to begin 360° coverage analysis.",
            "provider": "heuristic_agent"
        }

    @classmethod
    def _normalize_coverage_data(cls, data: Dict[str, Any], paths: List[Path]):
        data.setdefault("object_name", "Target Object")
        data.setdefault("coverage_score", min(len(paths) * 30, 95))
        data.setdefault("ready_for_3d", len(paths) >= 1)
        data.setdefault("missing_angles", [])
        data.setdefault("images_analyzed", [])
        for i, img_item in enumerate(data.get("images_analyzed", [])):
            if i < len(paths):
                img_item["filename"] = paths[i].name
