import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.services.gemini_service import GeminiVisionService

def test_gemini_service_empty_input():
    res = GeminiVisionService.analyze_coverage_and_angles([])
    assert res["coverage_score"] == 0
    assert res["ready_for_3d"] is False
    assert len(res["missing_angles"]) >= 1

def test_gemini_service_heuristic_fallback(tmp_path):
    img_1 = tmp_path / "front.jpg"
    img_2 = tmp_path / "side.jpg"

    dummy_img = np.full((300, 300, 3), 120, dtype=np.uint8)
    cv2.imwrite(str(img_1), dummy_img)
    cv2.imwrite(str(img_2), dummy_img)

    # 1 image analysis
    res_1 = GeminiVisionService.analyze_coverage_and_angles([img_1])
    assert res_1["coverage_score"] == 35
    assert res_1["ready_for_3d"] is True
    assert any("90°" in m["view"] for m in res_1["missing_angles"])

    # 2 image analysis
    res_2 = GeminiVisionService.analyze_coverage_and_angles([img_1, img_2])
    assert res_2["coverage_score"] == 65
    assert res_2["ready_for_3d"] is True

def test_gemini_smart_crop():
    dummy_img = np.zeros((1000, 1000, 3), dtype=np.uint8)
    # Put a white rectangle in the center
    cv2.rectangle(dummy_img, (300, 200), (700, 800), (255, 255, 255), -1)

    box_2d = [200, 300, 800, 700] # [ymin, xmin, ymax, xmax]
    cropped = GeminiVisionService.smart_crop_object(dummy_img, box_2d)

    # Cropped height and width should be around 600-700px (with 5% padding)
    h, w = cropped.shape[:2]
    assert 500 < h <= 1000
    assert 350 < w <= 1000
