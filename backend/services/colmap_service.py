import os
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from backend.config import settings

class ColmapService:
    def __init__(self, colmap_path: Optional[str] = None):
        self.colmap_path = colmap_path or settings.COLMAP_PATH

    def _run_colmap_command(
        self,
        args: List[str],
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> int:
        cmd = [self.colmap_path] + args
        if log_callback:
            log_callback(f"Executing: {' '.join(cmd)}", "INFO")

        # Creation flags for Windows process management
        creation_flags = 0
        if os.name == "nt":
            creation_flags = subprocess.CREATE_NO_WINDOW

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            creationflags=creation_flags
        )

        try:
            for line in iter(process.stdout.readline, ""):
                if cancel_check and cancel_check():
                    process.terminate()
                    if log_callback:
                        log_callback("COLMAP process canceled by user.", "WARNING")
                    return -1

                line_str = line.strip()
                if line_str and log_callback:
                    log_callback(line_str, "INFO")

            process.stdout.close()
            return_code = process.wait()
            return return_code
        except Exception as e:
            process.kill()
            if log_callback:
                log_callback(f"COLMAP execution error: {str(e)}", "ERROR")
            raise

    def extract_features(
        self,
        database_path: Path | str,
        image_path: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP feature_extractor on CPU (COLMAP 4.x compatible)"""
        args = [
            "feature_extractor",
            "--database_path", str(database_path),
            "--image_path", str(image_path),
            "--ImageReader.single_camera", "1",
            "--ImageReader.camera_model", "SIMPLE_RADIAL",
            "--FeatureExtraction.use_gpu", "0",
            "--FeatureExtraction.num_threads", "-1"
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0

    def match_features(
        self,
        database_path: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP exhaustive_matcher on CPU (COLMAP 4.x compatible)"""
        args = [
            "exhaustive_matcher",
            "--database_path", str(database_path),
            "--FeatureMatching.use_gpu", "0",
            "--FeatureMatching.num_threads", "-1"
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0

    def run_mapper(
        self,
        database_path: Path | str,
        image_path: Path | str,
        output_sparse_dir: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP incremental mapper on CPU"""
        os.makedirs(str(output_sparse_dir), exist_ok=True)
        args = [
            "mapper",
            "--database_path", str(database_path),
            "--image_path", str(image_path),
            "--output_path", str(output_sparse_dir),
            "--Mapper.min_model_size", "3",
            "--Mapper.num_threads", "-1"
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0

    def convert_model_to_ply(
        self,
        input_model_dir: Path | str,
        output_ply_path: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None
    ) -> bool:
        """Converts COLMAP binary/text model to PLY point cloud"""
        os.makedirs(os.path.dirname(output_ply_path), exist_ok=True)
        args = [
            "model_converter",
            "--input_path", str(input_model_dir),
            "--output_path", str(output_ply_path),
            "--output_type", "PLY"
        ]
        ret = self._run_colmap_command(args, log_callback)
        return ret == 0

    def export_model_to_txt(
        self,
        input_model_dir: Path | str,
        output_txt_dir: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None
    ) -> bool:
        """Converts COLMAP model to human-readable TXT files for camera poses & points inspection"""
        os.makedirs(str(output_txt_dir), exist_ok=True)
        args = [
            "model_converter",
            "--input_path", str(input_model_dir),
            "--output_path", str(output_txt_dir),
            "--output_type", "TXT"
        ]
        ret = self._run_colmap_command(args, log_callback)
        return ret == 0

    def parse_reconstruction_summary(self, model_dir: Path | str) -> Dict[str, Any]:
        """
        Parses camera poses and reconstruction statistics from TXT or PLY outputs.
        """
        model_path = Path(model_dir)
        cameras_file = model_path / "cameras.txt"
        images_file = model_path / "images.txt"
        points_file = model_path / "points3D.txt"

        registered_images = []
        camera_poses = []
        point_count = 0

        if images_file.exists():
            with open(images_file, "r", encoding="utf-8") as f:
                # COLMAP images.txt strictly alternates image metadata lines (even) and 2D keypoints lines (odd)
                non_comment_idx = 0
                for raw_line in f:
                    stripped = raw_line.strip()
                    if stripped.startswith("#"):
                        continue
                    is_header_line = (non_comment_idx % 2 == 0)
                    non_comment_idx += 1
                    if not is_header_line or not stripped:
                        continue
                    parts = stripped.split()
                    if len(parts) >= 10:
                        try:
                            # IMAGE_ID, QW, QX, QY, QZ, TX, TY, TZ, CAMERA_ID, NAME
                            img_id = int(parts[0])
                            qw, qx, qy, qz = map(float, parts[1:5])
                            tx, ty, tz = map(float, parts[5:8])
                            name = " ".join(parts[9:])
                            registered_images.append(name)
                            camera_poses.append({
                                "image_id": img_id,
                                "image_name": name,
                                "rotation": [qw, qx, qy, qz],
                                "translation": [tx, ty, tz]
                            })
                        except ValueError:
                            continue

        if points_file.exists():
            with open(points_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        point_count += 1

        return {
            "registered_image_count": len(registered_images),
            "registered_images": registered_images,
            "sparse_point_count": point_count,
            "camera_poses": camera_poses
        }

    def undistort_images(
        self,
        image_path: Path | str,
        input_model_dir: Path | str,
        output_dense_dir: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP image_undistorter for MVS preparation"""
        os.makedirs(str(output_dense_dir), exist_ok=True)
        args = [
            "image_undistorter",
            "--image_path", str(image_path),
            "--input_path", str(input_model_dir),
            "--output_path", str(output_dense_dir),
            "--output_type", "COLMAP"
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0

    def run_patch_match_stereo(
        self,
        dense_workspace_dir: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP patch_match_stereo (CPU-enabled with gpu_index -1)"""
        args = [
            "patch_match_stereo",
            "--workspace_path", str(dense_workspace_dir),
            "--workspace_format", "COLMAP",
            "--PatchMatchStereo.gpu_index", "-1",
            "--PatchMatchStereo.num_threads", "-1"
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0

    def run_stereo_fusion(
        self,
        dense_workspace_dir: Path | str,
        output_ply_path: Path | str,
        log_callback: Optional[Callable[[str, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> bool:
        """Runs COLMAP stereo_fusion to assemble dense fused point cloud"""
        os.makedirs(os.path.dirname(output_ply_path), exist_ok=True)
        args = [
            "stereo_fusion",
            "--workspace_path", str(dense_workspace_dir),
            "--workspace_format", "COLMAP",
            "--input_type", "geometric",
            "--output_path", str(output_ply_path)
        ]
        ret = self._run_colmap_command(args, log_callback, cancel_check)
        return ret == 0
