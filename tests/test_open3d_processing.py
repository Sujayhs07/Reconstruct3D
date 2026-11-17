import pytest
import numpy as np
import open3d as o3d
from pathlib import Path
from backend.services.open3d_service import Open3DService

def test_point_cloud_and_mesh_processing(tmp_path: Path):
    # Generate synthetic sphere point cloud with noisy outliers
    np.random.seed(42)
    n_points = 500
    phi = np.random.uniform(0, np.pi, n_points)
    theta = np.random.uniform(0, 2 * np.pi, n_points)
    r = 1.0

    x = r * np.sin(phi) * np.cos(theta)
    y = r * np.sin(phi) * np.sin(theta)
    z = r * np.cos(phi)
    sphere_pts = np.column_stack([x, y, z])

    # Add 10 far outliers
    outliers = np.random.uniform(-5, 5, size=(10, 3))
    all_pts = np.vstack([sphere_pts, outliers])

    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(all_pts)
    pcd.colors = o3d.utility.Vector3dVector(np.ones((len(all_pts), 3)) * 0.8)

    in_ply = tmp_path / "raw.ply"
    clean_ply = tmp_path / "clean.ply"
    mesh_ply = tmp_path / "mesh.ply"
    o3d.io.write_point_cloud(str(in_ply), pcd)

    # 1. Test Outlier Removal & Normal Estimation
    clean_res = Open3DService.process_point_cloud(in_ply, clean_ply, nb_neighbors=15, std_ratio=1.5)
    assert clean_res["original_point_count"] == 510
    assert clean_res["cleaned_point_count"] < 510
    assert clean_res["outliers_removed"] >= 5
    assert clean_res["has_normals"]
    assert clean_ply.exists()

    # 2. Test Poisson Surface Reconstruction
    mesh_res = Open3DService.reconstruct_poisson_mesh(clean_ply, mesh_ply, depth=6, target_triangles=2000)
    assert mesh_res["vertex_count"] > 10
    assert mesh_res["triangle_count"] > 10
    assert mesh_ply.exists()

    # 3. Test Export formats: PLY, OBJ, GLB
    export_base = tmp_path / "exported_model"
    exported = Open3DService.export_mesh_formats(mesh_ply, export_base)
    assert Path(exported["ply"]).exists()
    assert Path(exported["obj"]).exists()
    assert Path(exported["glb"]).exists()
    assert Path(exported["glb"]).stat().st_size > 0
