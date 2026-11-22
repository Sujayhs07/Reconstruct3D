import os
import time
import base64
import shutil
import httpx
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable
from backend.config import settings, load_dynamic_settings, BASE_DIR

class HFTripoSRService:
    """
    100% Free Cloud 3D Engine using open-source Hugging Face Spaces (TripoSR / Image-to-3D).
    Zero credit costs and zero token charges.
    """

    @classmethod
    def get_token(cls) -> Optional[str]:
        dyn = load_dynamic_settings()
        if dyn.get("hf_token"):
            return dyn["hf_token"].strip()
        if getattr(settings, "HF_TOKEN", None):
            return settings.HF_TOKEN.strip()
        env_val = os.getenv("HF_TOKEN")
        if env_val:
            return env_val.strip()
        return None

    @classmethod
    def generate_3d(
        cls,
        image_paths: List[Path],
        output_glb_path: Path,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Attempts to generate a 3D mesh via Free Hugging Face Spaces.
        Returns metadata dict on success, or None to fall back to the next provider.
        """
        if not image_paths:
            return None

        primary_image = image_paths[0]
        if not primary_image.exists():
            return None

        hf_token = cls.get_token()

        try:
            from gradio_client import Client, handle_file
        except ImportError:
            if log_callback:
                log_callback("gradio_client not installed; skipping Hugging Face space.", "WARNING")
            return None

        # Candidate free public spaces hosting TripoSR / Image-to-3D
        candidate_spaces = [
            ("stabilityai/TripoSR", "triposr"),
            ("frogleo/Image-to-3D", "imageto3d")
        ]

        for space_name, space_type in candidate_spaces:
            if cancel_check and cancel_check():
                return None

            try:
                if log_callback:
                    log_callback(f"[Hugging Face] Connecting to free space: {space_name}...", "INFO")

                client = Client(space_name, token=hf_token)

                if space_type == "triposr":
                    if log_callback:
                        log_callback("[Hugging Face TripoSR] Generating 3D neural mesh...", "INFO")
                    # Try calling TripoSR generate endpoint
                    res = client.predict(
                        input_image=handle_file(str(primary_image)),
                        api_name="/generate"
                    )
                    # TripoSR returns model file path or tuple (glb, obj)
                    glb_result = None
                    if isinstance(res, (tuple, list)):
                        for item in res:
                            if isinstance(item, str) and (item.endswith(".glb") or item.endswith(".obj")):
                                glb_result = item
                                break
                    elif isinstance(res, str):
                        glb_result = res

                    if glb_result and os.path.exists(glb_result):
                        output_glb_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(glb_result, output_glb_path)
                        if log_callback:
                            log_callback(f"[Hugging Face] 3D mesh successfully generated from {space_name}!", "INFO")
                        return {
                            "source": "huggingface_triposr",
                            "space": space_name,
                            "glb_path": str(output_glb_path)
                        }

                elif space_type == "imageto3d":
                    if log_callback:
                        log_callback(f"[Hugging Face {space_name}] Synthesizing 3D geometry from photograph...", "INFO")

                    res = client.predict(
                        image=handle_file(str(primary_image)),
                        steps=5,
                        guidance_scale=5.5,
                        seed=1234,
                        octree_resolution=256,
                        num_chunks=8000,
                        target_face_num=10000,
                        randomize_seed=True,
                        api_name="/gen_shape"
                    )

                    # res is (output, download, glb_path, obj_path)
                    glb_candidate = None
                    if isinstance(res, (tuple, list)):
                        for item in res:
                            if isinstance(item, str) and os.path.exists(item) and item.endswith(".glb"):
                                glb_candidate = item
                                break
                        if not glb_candidate and len(res) > 2 and isinstance(res[2], str) and os.path.exists(res[2]):
                            glb_candidate = res[2]

                    if glb_candidate and os.path.exists(glb_candidate):
                        output_glb_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(glb_candidate, output_glb_path)
                        if log_callback:
                            log_callback(f"[Hugging Face] 3D model generated successfully via {space_name}!", "INFO")
                        return {
                            "source": "huggingface_space",
                            "space": space_name,
                            "glb_path": str(output_glb_path)
                        }

            except Exception as e:
                err_str = str(e)
                if log_callback:
                    log_callback(f"[Hugging Face {space_name}] Unavailable ({err_str[:90]})...", "WARNING")
                continue

        return None


class Meshy3DService:
    """
    Meshy.ai Cloud 3D Engine (Free Tier provides 200 credits every month).
    Generates high-resolution textured 3D models from photos.
    """
    BASE_URL = "https://api.meshy.ai/openapi/v1"

    @classmethod
    def get_api_key(cls) -> Optional[str]:
        # 1. Dynamic settings
        dyn = load_dynamic_settings()
        if dyn.get("meshy_api_key"):
            return dyn["meshy_api_key"].strip()
        # 2. Settings object
        if getattr(settings, "MESHY_API_KEY", None):
            return settings.MESHY_API_KEY.strip()
        # 3. OS environment
        env_val = os.getenv("MESHY_API_KEY")
        if env_val:
            return env_val.strip()
        # 4. Root .env file
        env_file = BASE_DIR / ".env"
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("MESHY_API_KEY="):
                            val = line.split("=", 1)[1].strip()
                            if val:
                                return val
            except Exception:
                pass
        return None

    @classmethod
    def get_balance(cls) -> Dict[str, Any]:
        """Checks credit balance from Meshy.ai API."""
        api_key = cls.get_api_key()
        if not api_key:
            return {"valid": False, "balance": 0, "message": "No Meshy API key configured."}

        try:
            headers = {"Authorization": f"Bearer {api_key}"}
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{cls.BASE_URL}/balance", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    balance = data.get("balance", 0)
                    monthly = data.get("monthly_credits", 0)
                    return {
                        "valid": True,
                        "balance": balance,
                        "monthly_credits": monthly,
                        "message": f"Meshy.ai balance: {balance} credits remaining (monthly free credits: {monthly})."
                    }
                elif res.status_code in (401, 403):
                    return {"valid": False, "balance": 0, "message": "Invalid or expired Meshy API key."}
                elif res.status_code == 402:
                    return {"valid": False, "balance": 0, "message": "Meshy credit quota exhausted (0 credits)."}
                else:
                    return {"valid": False, "balance": 0, "message": f"Meshy API returned HTTP {res.status_code}."}
        except Exception as e:
            return {"valid": False, "balance": 0, "message": f"Network error checking Meshy balance: {str(e)}"}

    @classmethod
    def generate_3d(
        cls,
        image_paths: List[Path],
        output_glb_path: Path,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Submits image to Meshy.ai, polls progress, and downloads resulting GLB.
        Returns None if credits are 0 or task fails, enabling seamless failover.
        """
        api_key = cls.get_api_key()
        if not api_key:
            if log_callback:
                log_callback("[Meshy.ai] No MESHY_API_KEY configured.", "INFO")
            return None

        # Check balance first
        bal_info = cls.get_balance()
        if not bal_info.get("valid") or bal_info.get("balance", 0) <= 0:
            if log_callback:
                log_callback(f"[Meshy.ai] {bal_info.get('message', '0 credits remaining')}.", "WARNING")
            return None

        if log_callback:
            log_callback(f"[Meshy.ai] Connected! Available credits: {bal_info.get('balance')}.", "INFO")

        primary_image = image_paths[0]
        ext = primary_image.suffix.lstrip(".").lower() or "jpg"
        mime = "image/png" if ext == "png" else "image/jpeg"

        try:
            with open(primary_image, "rb") as f:
                b64_img = base64.b64encode(f.read()).decode("utf-8")
            data_uri = f"data:{mime};base64,{b64_img}"

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "image_url": data_uri,
                "ai_model": "meshy-7.1",
                "geometry_resolution": "standard",
                "should_texture": True,
                "enable_pbr": True,
                "target_formats": ["glb"]
            }

            if log_callback:
                log_callback("[Meshy.ai] Submitting image to Meshy Image-to-3D neural network...", "INFO")

            with httpx.Client(timeout=60.0) as client:
                res = client.post(f"{cls.BASE_URL}/image-to-3d", headers=headers, json=payload)
                if res.status_code not in (200, 201, 202):
                    if log_callback:
                        log_callback(f"[Meshy.ai] Task creation error ({res.status_code}): {res.text[:120]}", "WARNING")
                    return None

                task_data = res.json()
                task_id = task_data.get("result")
                if not task_id:
                    return None

                if log_callback:
                    log_callback(f"[Meshy.ai] Task ID: {task_id}. Generating 3D neural geometry and PBR textures...", "INFO")

                # Poll for completion
                max_wait_seconds = 180
                poll_interval = 3.0
                start_time = time.time()
                model_url = None

                while (time.time() - start_time) < max_wait_seconds:
                    if cancel_check and cancel_check():
                        if log_callback:
                            log_callback("[Meshy.ai] Task canceled by user.", "WARNING")
                        return None

                    poll_res = client.get(f"{cls.BASE_URL}/image-to-3d/{task_id}", headers=headers)
                    if poll_res.status_code == 200:
                        p_data = poll_res.json()
                        status = p_data.get("status")
                        progress = p_data.get("progress", 0)

                        if status == "SUCCEEDED":
                            model_urls = p_data.get("model_urls", {})
                            model_url = model_urls.get("glb")
                            break
                        elif status in ("FAILED", "EXPIRED"):
                            fail_msg = p_data.get("task_error", {}).get("message") or "Generation failed"
                            if log_callback:
                                log_callback(f"[Meshy.ai] Task failed: {fail_msg}", "WARNING")
                            return None
                        else:
                            if log_callback and int(progress) > 0:
                                log_callback(f"[Meshy.ai] 3D Neural Synthesis: {progress}% complete...", "INFO")

                    time.sleep(poll_interval)

                if not model_url:
                    if log_callback:
                        log_callback("[Meshy.ai] Timed out waiting for 3D model.", "WARNING")
                    return None

                # Download resulting GLB
                if log_callback:
                    log_callback("[Meshy.ai] Downloading generated 3D model (.glb)...", "INFO")

                dl_res = client.get(model_url, timeout=60.0)
                if dl_res.status_code == 200:
                    output_glb_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_glb_path, "wb") as f:
                        f.write(dl_res.content)
                    if log_callback:
                        log_callback(f"[Meshy.ai] 3D model successfully retrieved ({len(dl_res.content) // 1024} KB).", "INFO")
                    return {
                        "source": "meshy_ai",
                        "glb_path": str(output_glb_path),
                        "file_size": len(dl_res.content)
                    }

                return None

        except Exception as e:
            if log_callback:
                log_callback(f"[Meshy.ai] Error: {str(e)[:120]}", "WARNING")
            return None
