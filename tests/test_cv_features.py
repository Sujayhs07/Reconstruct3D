import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.services.cv_service import CVService

def test_image_quality_analysis():
    # Create sharp checkerboard image
    sharp_img = np.zeros((600, 800, 3), dtype=np.uint8)
    for i in range(0, 600, 40):
        for j in range(0, 800, 40):
            if (i // 40 + j // 40) % 2 == 0:
                sharp_img[i:i+40, j:j+40] = 255

    _, enc = cv2.imencode(".jpg", sharp_img)
    bytes_data = enc.tobytes()

    analysis = CVService.analyze_image_quality(bytes_data, "test_sharp.jpg")
    assert analysis["width"] == 800
    assert analysis["height"] == 600
    assert analysis["format"] == "jpg"
    assert analysis["sharpness"] > 100.0
    assert not analysis["is_blurry"]
    assert not analysis["is_dark"]
    assert not analysis["is_low_res"]

def test_blurry_and_dark_detection():
    # Blurry dark image
    dark_blurry = np.full((500, 500, 3), 20, dtype=np.uint8)
    dark_blurry = cv2.GaussianBlur(dark_blurry, (15, 15), 5)
    _, enc = cv2.imencode(".png", dark_blurry)
    analysis = CVService.analyze_image_quality(enc.tobytes(), "test_dark.png")

    assert analysis["is_dark"]
    assert analysis["is_blurry"]
    assert "Laplacian" in analysis["warning_reason"]

def test_sift_feature_extraction_and_matching(tmp_path: Path):
    # Create textured image pair with synthetic translation
    img1 = np.zeros((400, 400, 3), dtype=np.uint8)
    np.random.seed(42)
    # Draw textured circles and rectangles
    for _ in range(50):
        x, y = np.random.randint(50, 350, size=2)
        r = np.random.randint(10, 30)
        color = (int(np.random.randint(50, 255)), int(np.random.randint(50, 255)), int(np.random.randint(50, 255)))
        cv2.circle(img1, (x, y), r, color, -1)

    # Image 2 shifted by 10 pixels
    M = np.float32([[1, 0, 10], [0, 1, 5]])
    img2 = cv2.warpAffine(img1, M, (400, 400))

    p1 = tmp_path / "img1.jpg"
    p2 = tmp_path / "img2.jpg"
    p_vis = tmp_path / "vis.jpg"
    cv2.imwrite(str(p1), img1)
    cv2.imwrite(str(p2), img2)

    # Test SIFT extraction
    kp1, des1, count1 = CVService.extract_sift_features(p1, n_features=500)
    assert count1 > 20
    assert des1 is not None

    # Test Matching & RANSAC verification
    res = CVService.match_features_and_verify(p1, p2, p_vis, n_features=500)
    assert res["total_matches"] > 10
    assert res["inlier_matches"] > 5
    assert p_vis.exists()
