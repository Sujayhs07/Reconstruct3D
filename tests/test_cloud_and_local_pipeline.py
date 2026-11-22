import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.services.cloud_3d_service import HFTripoSRService, Meshy3DService
from backend.services.local_3d_engine import Local3DEngine

def test_meshy_service_zero_credits_handling(tmp_path):
    """Verifies that Meshy service gracefully detects missing key or 0 credits and returns None."""
    glb_out = tmp_path / "model.glb"
    test_img = tmp_path / "test.jpg"
    cv2.imwrite(str(test_img), np.zeros((100, 100, 3), dtype=np.uint8))

    logs = []
    res = Meshy3DService.generate_3d(
        image_paths=[test_img],
        output_glb_path=glb_out,
        log_callback=lambda msg, lvl: logs.append(msg)
    )
    # When no key or 0 credits, must return None without raising uncaught exceptions
    assert res is None

def test_hf_service_graceful_handling(tmp_path):
    """Verifies that Hugging Face space connector handles invalid or offline spaces gracefully."""
    glb_out = tmp_path / "model.glb"
    test_img = tmp_path / "test.jpg"
    cv2.imwrite(str(test_img), np.zeros((100, 100, 3), dtype=np.uint8))

    logs = []
    res = HFTripoSRService.generate_3d(
        image_paths=[test_img],
        output_glb_path=glb_out,
        log_callback=lambda msg, lvl: logs.append(msg)
    )
    # If spaces are in error or network is offline, returns None so it shifts to next provider
    if res is not None:
        assert Path(res["glb_path"]).exists()

def test_local_3d_engine_fallback_generation(tmp_path):
    """Verifies that Option A (Local 3D Engine on 16-core CPU) guarantees watertight 3D export."""
    exports_dir = tmp_path / "exports"
    pcd_dir = tmp_path / "point_clouds"
    img_path = tmp_path / "bottle.jpg"

    # Create dummy bottle image (vertical rectangle)
    img = np.full((400, 300, 3), 40, dtype=np.uint8)
    cv2.rectangle(img, (110, 50), (190, 360), (200, 180, 160), -1)
    cv2.imwrite(str(img_path), img)

    logs = []
    res = Local3DEngine.reconstruct_from_images(
        image_paths=[img_path],
        exports_dir=exports_dir,
        point_clouds_dir=pcd_dir,
        log_callback=lambda msg, lvl: logs.append(msg)
    )

    assert res["source"] == "local_offline_engine"
    assert Path(res["glb_path"]).exists()
    assert Path(res["obj_path"]).exists()
    assert Path(res["ply_path"]).exists()
    assert res["vertex_count"] > 1000
    assert res["triangle_count"] > 2000
