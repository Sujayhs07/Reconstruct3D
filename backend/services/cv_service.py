"""
Computer Vision Diagnostics & Feature Matching Service
------------------------------------------------------
Why this matters:
Feature detection and matching form the geometric backbone of photogrammetry (SfM):
1. Image Quality Metrics:
   - Laplacian Variance: Computes the 2nd derivative of spatial pixel intensity.
     Smooth, motion-blurred images have low variance (<90), while crisp in-focus edges produce high variance.
   - Brightness & Contrast: Warns against underexposed or flat lighting that hurts keypoint repeatability.
2. SIFT (Scale-Invariant Feature Transform):
   - Extracts scale- and rotation-invariant 128-dimensional descriptor vectors.
   - Robust against changes in camera zoom, perspective rotation, and illumination.
3. Feature Matching & Geometric Verification:
   - Uses FLANN / KNN matching with k=2 nearest neighbors.
   - Lowe's Ratio Test: Rejects ambiguous matches where d_best / d_second > 0.75.
   - Epipolar RANSAC: Fits the Fundamental Matrix (cv2.findFundamentalMat) using RANSAC.
     Discards geometric outliers (points violating epipolar line constraints) to ensure
     only true physical correspondences are passed to 3D triangulation.
"""

import os
import gc
import shutil
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

class CVService:
    @staticmethod
    def analyze_image_quality(image_input: bytes | Path | str, filename: str) -> Dict[str, Any]:
        """
        Analyzes image quality: dimensions, brightness, contrast, and Laplacian variance sharpness.
        Accepts either raw bytes or file path (Path or str).
        Memory-optimized for cloud deployment with 512MB RAM cap (Render free tier).
        """
        if isinstance(image_input, (bytes, bytearray)):
            np_arr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            file_size = len(image_input)
            del np_arr
        else:
            img = cv2.imread(str(image_input))
            file_size = os.path.getsize(str(image_input)) if os.path.exists(str(image_input)) else 0

        if img is None:
            raise ValueError(f"Failed to decode image: {filename}. Corrupt or unsupported format.")

        height, width = img.shape[:2]
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"

        # Downsample preview if dimensions exceed 1200 px to prevent memory spike on low-RAM hosts
        if max(height, width) > 1200:
            scale = 1200.0 / float(max(height, width))
            new_w = max(1, int(width * scale))
            new_h = max(1, int(height * scale))
            preview = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            del img
            gray = cv2.cvtColor(preview, cv2.COLOR_BGR2GRAY)
            del preview
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            del img

        # 1. Average Brightness (0-255)
        avg_brightness = float(np.mean(gray))

        # 2. Contrast (standard deviation of pixel intensities)
        contrast = float(np.std(gray))

        # 3. Sharpness using Laplacian variance with CV_32F to save memory
        laplacian = cv2.Laplacian(gray, cv2.CV_32F)
        sharpness = float(laplacian.var())
        del gray, laplacian
        gc.collect()

        # Quality criteria thresholds
        is_blurry = sharpness < 90.0
        is_dark = avg_brightness < 40.0
        is_low_res = (width < 640 or height < 480)

        warnings = []
        if is_blurry:
            warnings.append(f"Low edge sharpness (Laplacian variance {sharpness:.1f} < 90.0). Image may be motion-blurred or out of focus.")
        if is_dark:
            warnings.append(f"Low scene illumination (Average brightness {avg_brightness:.1f} < 40.0). Feature detection may be degraded.")
        if is_low_res:
            warnings.append(f"Low resolution ({width}x{height} < 640x480). Photogrammetry requires sufficient pixel density.")

        warning_reason = " | ".join(warnings) if warnings else None

        return {
            "width": width,
            "height": height,
            "file_size": file_size,
            "format": ext,
            "avg_brightness": round(avg_brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "is_blurry": is_blurry,
            "is_dark": is_dark,
            "is_low_res": is_low_res,
            "is_duplicate": False,
            "warning_reason": warning_reason
        }

    @staticmethod
    def preprocess_image(
        input_path: Path | str,
        output_path: Path | str,
        max_dimension: int = 2000,
        apply_denoise: bool = False
    ) -> Dict[str, Any]:
        """
        Preprocesses image for SfM without modifying the original source image.
        Resizes while preserving aspect ratio and optionally applies mild Gaussian smoothing.
        """
        img = cv2.imread(str(input_path))
        if img is None:
            raise ValueError(f"Cannot read image at {input_path}")

        h, w = img.shape[:2]
        new_w, new_h = w, h

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Preserve original pixels without lossy re-compression if no resize or denoise is required
        if max(h, w) <= max_dimension and not apply_denoise:
            shutil.copy2(str(input_path), str(output_path))
            return {
                "processed_width": new_w,
                "processed_height": new_h,
                "processed_path": str(output_path)
            }

        # Resize if dimensions exceed max_dimension
        if max(h, w) > max_dimension:
            scale = max_dimension / float(max(h, w))
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

        if apply_denoise:
            # Mild 3x3 Gaussian smoothing to suppress sensor noise without degrading SIFT gradients
            img = cv2.GaussianBlur(img, (3, 3), 0.5)

        cv2.imwrite(str(output_path), img, [cv2.IMWRITE_JPEG_QUALITY, 95])

        return {
            "processed_width": new_w,
            "processed_height": new_h,
            "processed_path": str(output_path)
        }

    @staticmethod
    def extract_sift_features(
        image_path: Path | str,
        n_features: int = 2000,
        max_dimension: Optional[int] = 1600
    ) -> Tuple[list, np.ndarray, int]:
        """
        Extracts SIFT keypoints and descriptors using OpenCV SIFT detector.
        Memory-optimized: scales large images to max_dimension for efficient keypoint detection.
        """
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Unable to load image for SIFT extraction: {image_path}")

        h, w = img.shape[:2]
        if max_dimension and max(h, w) > max_dimension:
            scale = max_dimension / float(max(h, w))
            new_w = max(1, int(w * scale))
            new_h = max(1, int(h * scale))
            preview = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            del img
            gray = cv2.cvtColor(preview, cv2.COLOR_BGR2GRAY)
            del preview
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            del img

        sift = cv2.SIFT_create(nfeatures=n_features)
        keypoints, descriptors = sift.detectAndCompute(gray, None)
        del gray, sift
        gc.collect()

        kp_list = keypoints if keypoints is not None else []
        kp_count = len(kp_list)
        return kp_list, descriptors, kp_count

    @staticmethod
    def match_features_and_verify(
        img1_path: Path | str,
        img2_path: Path | str,
        output_vis_path: Path | str,
        n_features: int = 2000,
        ratio_threshold: float = 0.75,
        ransac_threshold: float = 3.0,
        max_dimension: int = 1600
    ) -> Dict[str, Any]:
        """
        Extracts SIFT features from two images, performs KNN matching with Lowe's ratio test,
        and applies RANSAC geometric verification using the Fundamental Matrix.
        Renders side-by-side match visualization with inlier epipolar matches.
        Memory-optimized to prevent OOM on 512MB RAM cloud tiers.
        """
        img1 = cv2.imread(str(img1_path))
        img2 = cv2.imread(str(img2_path))

        if img1 is None or img2 is None:
            raise ValueError("Failed to load one or both images for feature matching.")

        # Scale down large images for feature matching to prevent high-res memory explosion
        h1, w1 = img1.shape[:2]
        if max(h1, w1) > max_dimension:
            scale1 = max_dimension / float(max(h1, w1))
            img1 = cv2.resize(img1, (int(w1 * scale1), int(h1 * scale1)), interpolation=cv2.INTER_AREA)

        h2, w2 = img2.shape[:2]
        if max(h2, w2) > max_dimension:
            scale2 = max_dimension / float(max(h2, w2))
            img2 = cv2.resize(img2, (int(w2 * scale2), int(h2 * scale2)), interpolation=cv2.INTER_AREA)

        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        # SIFT Keypoint & Descriptor Extraction
        sift = cv2.SIFT_create(nfeatures=n_features)
        kp1, des1 = sift.detectAndCompute(gray1, None)
        kp2, des2 = sift.detectAndCompute(gray2, None)
        del gray1, gray2, sift
        gc.collect()

        if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
            return {
                "total_matches": 0,
                "inlier_matches": 0,
                "visualization_path": None,
                "kp1_count": len(kp1) if kp1 else 0,
                "kp2_count": len(kp2) if kp2 else 0
            }

        # Flann or BFMatcher with L2 norm
        bf = cv2.BFMatcher(cv2.NORM_L2)
        raw_matches = bf.knnMatch(des1, des2, k=2)

        # Lowe's ratio test
        good_matches = []
        for pair in raw_matches:
            if len(pair) == 2:
                m, n = pair
                if m.distance < ratio_threshold * n.distance:
                    good_matches.append(m)

        inlier_count = 0
        inlier_mask = None

        # Geometric Verification with RANSAC using Fundamental Matrix
        if len(good_matches) >= 8:
            pts1 = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            pts2 = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

            F, mask = cv2.findFundamentalMat(pts1, pts2, cv2.FM_RANSAC, ransac_threshold, 0.99)
            if mask is not None:
                inlier_mask = mask.ravel().tolist()
                inlier_count = int(np.sum(mask))
        else:
            inlier_count = len(good_matches)

        # Generate side-by-side match visualization
        matches_mask = inlier_mask if inlier_mask is not None else [1] * len(good_matches)

        draw_params = dict(
            matchColor=(0, 255, 0),       # Green for inlier matches
            singlePointColor=(0, 0, 255),  # Red for non-matched keypoints
            matchesMask=matches_mask,      # Draw verified inliers
            flags=cv2.DrawMatchesFlags_DEFAULT
        )

        vis_img = cv2.drawMatches(img1, kp1, img2, kp2, good_matches, None, **draw_params)

        os.makedirs(os.path.dirname(output_vis_path), exist_ok=True)
        cv2.imwrite(str(output_vis_path), vis_img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        del img1, img2, vis_img
        gc.collect()

        return {
            "total_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "visualization_path": str(output_vis_path),
            "kp1_count": len(kp1),
            "kp2_count": len(kp2)
        }
