"""
Generates a realistic multi-view dataset of a textured 3D object viewed from multiple camera angles.
Each image simulates a camera capturing the object with perspective projection and rich SIFT features.
"""
import os
import cv2
import numpy as np
from pathlib import Path

def create_rich_texture(size=600):
    """Creates a high-contrast textured pattern rich in corner and blob features for SIFT."""
    tex = np.ones((size, size, 3), dtype=np.uint8) * 240
    # Add checkerboard background
    grid = 40
    for y in range(0, size, grid):
        for x in range(0, size, grid):
            if (x // grid + y // grid) % 2 == 0:
                tex[y:y+grid, x:x+grid] = (180, 180, 180)

    # Add geometric symbols, shapes, text
    np.random.seed(101)
    for _ in range(80):
        cx, cy = np.random.randint(50, size-50, size=2)
        r = np.random.randint(10, 35)
        color = (int(np.random.randint(20, 200)), int(np.random.randint(20, 200)), int(np.random.randint(20, 200)))
        shape_type = np.random.randint(0, 3)
        if shape_type == 0:
            cv2.circle(tex, (cx, cy), r, color, -1)
            cv2.circle(tex, (cx, cy), r//2, (255, 255, 255), 2)
        elif shape_type == 1:
            cv2.rectangle(tex, (cx-r, cy-r), (cx+r, cy+r), color, -1)
            cv2.rectangle(tex, (cx-r, cy-r), (cx+r, cy+r), (0, 0, 0), 2)
        else:
            pts = np.array([[cx, cy-r], [cx+r, cy+r], [cx-r, cy+r]], np.int32)
            cv2.fillPoly(tex, [pts], color)

    cv2.putText(tex, "RECONSTRUCT3D", (120, 310), cv2.FONT_HERSHEY_DUPLEX, 1.2, (20, 30, 160), 3)
    cv2.putText(tex, "CGIP-PHOTOGRAMMETRY", (100, 350), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (180, 20, 40), 2)
    return tex

def project_view(texture, angle_deg, elevation_deg=15, out_w=800, out_h=600):
    """Projects the 3D planar/multi-planar object with camera intrinsics and extrinsics."""
    h, w = texture.shape[:2]
    # Source corners on texture
    src_pts = np.float32([[0, 0], [w, 0], [w, h], [0, h]])

    # Center and scale
    cx = out_w / 2.0
    cy = out_h / 2.0
    rad = np.radians(angle_deg)
    elev_rad = np.radians(elevation_deg)

    cos_a = np.cos(rad)
    sin_a = np.sin(rad)
    cos_e = np.cos(elev_rad)

    # Perspective destination corners
    scale = 220
    corners = np.array([
        [-1, -1, 0],
        [ 1, -1, 0],
        [ 1,  1, 0],
        [-1,  1, 0]
    ], dtype=np.float32)

    # Rotate around Y and tilt by elevation
    dst_pts = []
    for x, y, z in corners:
        # Yaw
        rx = x * cos_a - z * sin_a
        rz = x * sin_a + z * cos_a
        # Pitch
        ry = y * cos_e - rz * np.sin(elev_rad)
        rz = y * np.sin(elev_rad) + rz * cos_e

        # Perspective projection with focal length f
        f = 500.0
        dist = 3.2 + rz
        px = cx + (rx * f) / dist
        py = cy + (ry * f) / dist
        dst_pts.append([px, py])

    dst_pts = np.float32(dst_pts)

    H, _ = cv2.findHomography(src_pts, dst_pts)
    warped = cv2.warpPerspective(texture, H, (out_w, out_h), borderValue=(20, 22, 28))

    # Add subtle lighting gradient based on angle
    gradient = np.linspace(0.85, 1.15, out_w)
    light_map = np.tile(gradient, (out_h, 1))
    warped = np.clip(warped.astype(np.float32) * light_map[:, :, np.newaxis], 0, 255).astype(np.uint8)

    return warped

def generate_dataset(output_dir="data/sample_cube", num_views=8):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    tex = create_rich_texture(700)

    angles = np.linspace(-40, 40, num_views)
    print(f"Generating {num_views} sample viewpoints in {out_path}...")

    for i, ang in enumerate(angles):
        view = project_view(tex, angle_deg=ang, elevation_deg=10 + (i % 3) * 5)
        filename = f"view_{i+1:02d}.jpg"
        file_path = out_path / filename
        cv2.imwrite(str(file_path), view, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  [Created] {filename} (Yaw: {ang:.1f} deg)")

    print(f"Successfully created {num_views} sample photographs in {output_dir}")

if __name__ == "__main__":
    generate_dataset()
