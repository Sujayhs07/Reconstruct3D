import io
import cv2
import numpy as np
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "colmap_available" in data

def test_project_crud_and_image_upload():
    # 1. Create Project
    resp = client.post("/api/projects", json={
        "name": "Test Scientific Reconstruction",
        "description": "Integration test for 3D photogrammetry project"
    })
    assert resp.status_code == 201
    proj = resp.json()
    proj_id = proj["id"]
    assert proj["name"] == "Test Scientific Reconstruction"
    assert proj["status"] == "created"

    # 2. Upload Synthetic Test Images
    img1 = np.ones((600, 800, 3), dtype=np.uint8) * 120
    cv2.putText(img1, "RECONSTRUCT3D", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    _, enc1 = cv2.imencode(".jpg", img1)

    img2 = np.copy(img1)
    cv2.circle(img2, (400, 300), 50, (0, 255, 0), -1)
    _, enc2 = cv2.imencode(".jpg", img2)

    files = [
        ("files", ("view_1.jpg", io.BytesIO(enc1.tobytes()), "image/jpeg")),
        ("files", ("view_2.jpg", io.BytesIO(enc2.tobytes()), "image/jpeg"))
    ]

    upload_resp = client.post(f"/api/projects/{proj_id}/images", files=files)
    assert upload_resp.status_code == 201
    uploaded = upload_resp.json()
    assert len(uploaded) == 2
    assert uploaded[0]["width"] == 800
    assert uploaded[0]["height"] == 600

    # 3. Check Image Quality Analysis
    analysis_resp = client.get(f"/api/projects/{proj_id}/analysis")
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()
    assert analysis["total_images"] == 2
    assert "quality_rating" in analysis

    # 4. Feature Extraction & Matching
    match_resp = client.post(f"/api/projects/{proj_id}/features", json={
        "image1_id": uploaded[0]["id"],
        "image2_id": uploaded[1]["id"],
        "n_features": 1000
    })
    assert match_resp.status_code == 201
    match_data = match_resp.json()
    assert "total_matches" in match_data

    # 5. Check Project Status
    status_resp = client.get(f"/api/projects/{proj_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["image_count"] == 2

    # 6. Delete Project
    del_resp = client.delete(f"/api/projects/{proj_id}")
    assert del_resp.status_code == 200

    # 7. Verify 404 after deletion
    check_resp = client.get(f"/api/projects/{proj_id}")
    assert check_resp.status_code == 404

def test_network_info():
    resp = client.get("/api/network-info")
    assert resp.status_code == 200
    data = resp.json()
    assert "lan_ip" in data
    assert "port" in data
    assert data["port"] == 8000
