import os
import open3d as o3d
import numpy as np
import trimesh
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

class Open3DService:
    @staticmethod
    def load_point_cloud(pcd_path: Path | str) -> o3d.geometry.PointCloud:
        pcd = o3d.io.read_point_cloud(str(pcd_path))
        if pcd.is_empty():
            raise ValueError(f"Point cloud at {pcd_path} is empty or unreadable.")
        return pcd

    @staticmethod
    def get_point_cloud_stats(pcd: o3d.geometry.PointCloud) -> Dict[str, Any]:
        points = np.asarray(pcd.points)
        count = len(points)
        if count == 0:
            return {"point_count": 0, "has_normals": False, "has_colors": False, "bounds_min": [], "bounds_max": [], "center": []}

        has_normals = pcd.has_normals()
        has_colors = pcd.has_colors()
        bbox = pcd.get_axis_aligned_bounding_box()
        bounds_min = bbox.get_min_bound().tolist()
        bounds_max = bbox.get_max_bound().tolist()
        center = pcd.get_center().tolist()

        return {
            "point_count": count,
            "has_normals": has_normals,
            "has_colors": has_colors,
            "bounds_min": [round(x, 4) for x in bounds_min],
            "bounds_max": [round(x, 4) for x in bounds_max],
            "center": [round(x, 4) for x in center]
        }

    @staticmethod
    def process_point_cloud(
        input_pcd_path: Path | str,
        output_cleaned_path: Path | str,
        nb_neighbors: int = 20,
        std_ratio: float = 2.0,
        estimate_normals_flag: bool = True
    ) -> Dict[str, Any]:
        """
        Applies Statistical Outlier Removal and Normal Estimation to the point cloud.
        """
        pcd = Open3DService.load_point_cloud(input_pcd_path)
        orig_count = len(pcd.points)

        # Statistical Outlier Removal
        cleaned_pcd, ind = pcd.remove_statistical_outlier(
            nb_neighbors=nb_neighbors,
            std_ratio=std_ratio
        )
        cleaned_count = len(cleaned_pcd.points)

        # Normal Estimation if not present or requested
        if estimate_normals_flag or not cleaned_pcd.has_normals():
            cleaned_pcd.estimate_normals(
                search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30)
            )
            try:
                cleaned_pcd.orient_normals_consistent_tangent_plane(k=15)
            except Exception:
                pass

        os.makedirs(os.path.dirname(output_cleaned_path), exist_ok=True)
        o3d.io.write_point_cloud(str(output_cleaned_path), cleaned_pcd, write_ascii=False)

        stats = Open3DService.get_point_cloud_stats(cleaned_pcd)
        return {
            "original_point_count": orig_count,
            "cleaned_point_count": cleaned_count,
            "outliers_removed": orig_count - cleaned_count,
            "cleaned_file_path": str(output_cleaned_path),
            **stats
        }

    @staticmethod
    def reconstruct_poisson_mesh(
        input_pcd_path: Path | str,
        output_mesh_path: Path | str,
        depth: int = 9,
        density_quantile: float = 0.05,
        target_triangles: int = 50000
    ) -> Dict[str, Any]:
        """
        Generates 3D Poisson surface reconstruction, trims low-density artifacts,
        simplifies the mesh using quadric decimation, and computes vertex normals.
        """
        pcd = Open3DService.load_point_cloud(input_pcd_path)

        if not pcd.has_normals():
            pcd.estimate_normals(
                search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30)
            )
            try:
                pcd.orient_normals_consistent_tangent_plane(k=15)
            except Exception:
                pass

        # Screened Poisson Surface Reconstruction
        mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
            pcd, depth=depth
        )

        densities_arr = np.asarray(densities)
        if len(densities_arr) > 0 and density_quantile > 0:
            # Filter low density boundary / hallucinated vertices
            threshold = np.quantile(densities_arr, density_quantile)
            vertices_to_remove = densities_arr < threshold
            mesh.remove_vertices_by_mask(vertices_to_remove)

        raw_vertex_count = len(mesh.vertices)
        raw_triangle_count = len(mesh.triangles)

        # Quadric decimation mesh simplification
        if raw_triangle_count > target_triangles:
            mesh = mesh.simplify_quadric_decimation(target_number_of_triangles=target_triangles)

        mesh.remove_degenerate_triangles()
        mesh.remove_duplicated_triangles()
        mesh.remove_duplicated_vertices()
        mesh.remove_non_manifold_edges()
        mesh.compute_vertex_normals()

        os.makedirs(os.path.dirname(output_mesh_path), exist_ok=True)
        o3d.io.write_triangle_mesh(str(output_mesh_path), mesh, write_ascii=False)

        bbox = mesh.get_axis_aligned_bounding_box()
        bounds_min = bbox.get_min_bound().tolist()
        bounds_max = bbox.get_max_bound().tolist()

        return {
            "vertex_count": len(mesh.vertices),
            "triangle_count": len(mesh.triangles),
            "raw_vertex_count": raw_vertex_count,
            "raw_triangle_count": raw_triangle_count,
            "mesh_path": str(output_mesh_path),
            "has_vertex_normals": mesh.has_vertex_normals(),
            "has_vertex_colors": mesh.has_vertex_colors(),
            "bounds_min": [round(x, 4) for x in bounds_min],
            "bounds_max": [round(x, 4) for x in bounds_max]
        }

    @staticmethod
    def export_mesh_formats(
        input_mesh_path: Path | str,
        export_base_path: Path | str
    ) -> Dict[str, str]:
        """
        Exports the mesh into standard 3D formats: PLY, OBJ, and GLB.
        Uses Trimesh for standard-compliant GLB export for Three.js.
        """
        base = Path(export_base_path)
        base.parent.mkdir(parents=True, exist_ok=True)

        ply_path = base.with_suffix(".ply")
        obj_path = base.with_suffix(".obj")
        glb_path = base.with_suffix(".glb")

        mesh = o3d.io.read_triangle_mesh(str(input_mesh_path))
        if mesh.is_empty():
            raise ValueError(f"Mesh at {input_mesh_path} is empty or unreadable.")

        # 1. Export PLY
        o3d.io.write_triangle_mesh(str(ply_path), mesh, write_ascii=False)

        # 2. Export OBJ
        o3d.io.write_triangle_mesh(str(obj_path), mesh, write_ascii=True)

        # 3. Export GLB via Trimesh
        vertices = np.asarray(mesh.vertices)
        faces = np.asarray(mesh.triangles)
        vertex_colors = None
        if mesh.has_vertex_colors():
            # Open3D stores float colors [0, 1]
            vertex_colors = (np.asarray(mesh.vertex_colors) * 255).astype(np.uint8)

        vertex_normals = None
        if mesh.has_vertex_normals():
            vertex_normals = np.asarray(mesh.vertex_normals)

        tri_mesh = trimesh.Trimesh(
            vertices=vertices,
            faces=faces,
            vertex_colors=vertex_colors,
            vertex_normals=vertex_normals,
            process=False
        )
        tri_mesh.export(str(glb_path), file_type="glb")

        return {
            "ply": str(ply_path),
            "obj": str(obj_path),
            "glb": str(glb_path)
        }
