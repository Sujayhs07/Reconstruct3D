import os
import shutil
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

class CVService:
    @staticmethod
    def analyze_image_quality(image_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Analyzes image quality: dimensions, brightness, contrast, and Laplacian variance sharpness.
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError(f"Failed to decode image: {filename}. Corrupt or unsupported format.")

        height, width, channels = img.shape
        file_size = len(image_bytes)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"

        # Convert to grayscale for illumination & gradient analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Average Brightness (0-255)
        avg_brightness = float(np.mean(gray))

        # 2. Contrast (standard deviation of pixel intensities)
        contrast = float(np.std(gray))

        # 3. Sharpness using Laplacian variance
        # High variance indicates sharp focus and edges; low variance indicates blur.
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = float(laplacian.var())

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
        n_features: int = 2000
    ) -> Tuple[list, np.ndarray, int]:
        """
        Extracts SIFT keypoints and descriptors using OpenCV SIFT detector.
        """
        img = cv2.imread(str(image_path))
        if img is None:
            raise ValueError(f"Unable to load image for SIFT extraction: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sift = cv2.SIFT_create(nfeatures=n_features)
        keypoints, descriptors = sift.detectAndCompute(gray, None)

        return keypoints, descriptors, len(keypoints)

    @staticmethod
    def match_features_and_verify(
        img1_path: Path | str,
        img2_path: Path | str,
        output_vis_path: Path | str,
        n_features: int = 2000,
        ratio_threshold: float = 0.75,
        ransac_threshold: float = 3.0
    ) -> Dict[str, Any]:
        """
        Extracts SIFT features from two images, performs KNN matching with Lowe's ratio test,
        and applies RANSAC geometric verification using the Fundamental Matrix.
        Renders side-by-side match visualization with inlier epipolar matches.
        """
        img1 = cv2.imread(str(img1_path))
        img2 = cv2.imread(str(img2_path))

        if img1 is None or img2 is None:
            raise ValueError("Failed to load one or both images for feature matching.")

        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        # SIFT Keypoint & Descriptor Extraction
        sift = cv2.SIFT_create(nfeatures=n_features)
        kp1, des1 = sift.detectAndCompute(gray1, None)
        kp2, des2 = sift.detectAndCompute(gray2, None)

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

        return {
            "total_matches": len(good_matches),
            "inlier_matches": inlier_count,
            "visualization_path": str(output_vis_path),
            "kp1_count": len(kp1),
            "kp2_count": len(kp2)
        }
