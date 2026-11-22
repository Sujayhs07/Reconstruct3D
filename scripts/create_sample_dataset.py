"""
Generates a realistic multi-view dataset of a true 3D volumetric textured cube viewed
from multiple orbital camera viewpoints with perspective projection and rich SIFT features.
"""
import os
import cv2
import numpy as np
from pathlib import Path

def create_face_texture(label: str, bg_color: tuple, pattern: str = "checker", size: int = 500) -> np.ndarray:
    """Creates a high-contrast textured pattern rich in corner and blob features for SIFT."""
    tex = np.full((size, size, 3), bg_color, dtype=np.uint8)
    
    # 1. Base grid pattern
    grid = 35
    darker = (max(0, int(bg_color[0]*0.75)), max(0, int(bg_color[1]*0.75)), max(0, int(bg_color[2]*0.75)))
    for y in range(0, size, grid):
        for x in range(0, size, grid):
            if (x // grid + y // grid) % 2 == 0:
                tex[y:y+grid, x:x+grid] = darker

    # 2. Geometric details based on pattern type
    np.random.seed(abs(hash(label)) % (2**31))
    if pattern == "circles":
        for r in range(50, size // 2, 40):
            cv2.circle(tex, (size//2, size//2), r, (255, 255, 255), 3)
            cv2.circle(tex, (size//2, size//2), r - 15, (20, 20, 20), 2)
    elif pattern == "cross":
        cv2.line(tex, (0, 0), (size, size), (255, 255, 255), 4)
        cv2.line(tex, (size, 0), (0, size), (255, 255, 255), 4)
        cv2.rectangle(tex, (size//4, size//4), (3*size//4, 3*size//4), (255, 255, 255), 3)
    elif pattern == "stripes":
        for i in range(0, size, 30):
            cv2.line(tex, (0, i), (size, i), (255, 255, 255), 2)
    else:
        for _ in range(25):
            cx, cy = np.random.randint(40, size - 40, size=2)
            rad = np.random.randint(12, 28)
            cv2.circle(tex, (cx, cy), rad, (int(np.random.randint(30, 240)), int(np.random.randint(30, 240)), int(np.random.randint(30, 240))), -1)
            cv2.circle(tex, (cx, cy), rad, (255, 255, 255), 2)

    # 3. Bold corner markers (ArUco-style for high-confidence SIFT detection)
    c_size = 45
    cv2.rectangle(tex, (10, 10), (10 + c_size, 10 + c_size), (0, 0, 0), -1)
    cv2.rectangle(tex, (size - 10 - c_size, 10), (size - 10, 10 + c_size), (0, 0, 0), -1)
    cv2.rectangle(tex, (10, size - 10 - c_size), (10 + c_size, size - 10), (0, 0, 0), -1)
    cv2.rectangle(tex, (size - 10 - c_size, size - 10 - c_size), (size - 10, size - 10), (0, 0, 0), -1)

    # 4. Text labels
    cv2.putText(tex, label, (size//8, size//2 + 15), cv2.FONT_HERSHEY_DUPLEX, 1.4, (255, 255, 255), 3)
    cv2.putText(tex, "RECONSTRUCT3D", (size//8, size//2 + 55), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 230, 255), 2)

    return tex

def render_3d_cube_scene(
    faces_data: dict,
    yaw_deg: float,
    pitch_deg: float,
    out_w: int = 800,
    out_h: int = 600,
    focal_length: float = 650.0,
    camera_distance: float = 4.0
) -> np.ndarray:
    """Renders a true 3D textured cube from arbitrary yaw/pitch viewpoints with perspective depth."""
    canvas = np.full((out_h, out_w, 3), (20, 22, 28), dtype=np.uint8)

    # Optional subtle ground shadow/table
    cv2.ellipse(canvas, (out_w // 2, int(out_h * 0.78)), (260, 60), 0, 0, 360, (14, 16, 20), -1)

    cx = out_w / 2.0
    cy = out_h / 2.0
    yaw = np.radians(yaw_deg)
    pitch = np.radians(pitch_deg)

    # Light direction vector (from top-right-front)
    light_dir = np.array([0.4, 0.7, 0.6], dtype=np.float32)
    light_dir /= np.linalg.norm(light_dir)

    visible_faces = []

    for name, (normal, corners, texture) in faces_data.items():
        # Rotate normal vector by yaw and pitch to camera space
        nx = normal[0] * np.cos(yaw) - normal[2] * np.sin(yaw)
        nz = normal[0] * np.sin(yaw) + normal[2] * np.cos(yaw)
        ny = normal[1] * np.cos(pitch) - nz * np.sin(pitch)
        nz_cam = normal[1] * np.sin(pitch) + nz * np.cos(pitch)

        # Backface culling: only process faces pointing towards camera
        if nz_cam > 0.05:
            # Transform all 4 corners
            corners_cam = []
            corners_2d = []
            for pt in corners:
                x, y, z = pt
                x1 = x * np.cos(yaw) - z * np.sin(yaw)
                z1 = x * np.sin(yaw) + z * np.cos(yaw)
                y2 = y * np.cos(pitch) - z1 * np.sin(pitch)
                z2 = y * np.sin(pitch) + z1 * np.cos(pitch)
                zc = camera_distance + z2
                px = cx + (x1 * focal_length) / zc
                py = cy - (y2 * focal_length) / zc
                corners_cam.append([x1, y2, zc])
                corners_2d.append([px, py])

            corners_cam = np.array(corners_cam, dtype=np.float32)
            corners_2d = np.array(corners_2d, dtype=np.float32)
            avg_z = float(np.mean(corners_cam[:, 2]))

            # Shading factor
            norm_cam = np.array([nx, ny, nz_cam], dtype=np.float32)
            norm_cam /= np.linalg.norm(norm_cam)
            shading = float(np.clip(0.45 + 0.55 * np.dot(norm_cam, light_dir), 0.35, 1.1))

            visible_faces.append({
                "name": name,
                "avg_z": avg_z,
                "corners_2d": corners_2d,
                "texture": texture,
                "shading": shading
            })

    # Sort back-to-front (Painter's algorithm)
    visible_faces.sort(key=lambda item: item["avg_z"], reverse=True)

    tex_h, tex_w = 500, 500
    src_pts = np.float32([[0, 0], [tex_w, 0], [tex_w, tex_h], [0, tex_h]])

    for item in visible_faces:
        dst_pts = item["corners_2d"]
        H, _ = cv2.findHomography(src_pts, dst_pts)
        if H is None:
            continue
        warped = cv2.warpPerspective(item["texture"], H, (out_w, out_h), flags=cv2.INTER_LINEAR)

        # Apply lighting
        if item["shading"] != 1.0:
            warped = np.clip(warped.astype(np.float32) * item["shading"], 0, 255).astype(np.uint8)

        # Mask precisely onto canvas
        mask = np.zeros((out_h, out_w), dtype=np.uint8)
        poly = dst_pts.astype(np.int32)
        cv2.fillConvexPoly(mask, poly, 255)
        canvas[mask > 0] = warped[mask > 0]

    return canvas

def generate_dataset(output_dir: str = "data/sample_cube", num_views: int = 12):
    """Generates an orbit of perspective photographs around a true 3D textured volumetric cube."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # Build unique, colorful high-frequency textures for each 3D cube face
    cube_size = 1.0
    faces_data = {
        "FRONT": (
            np.array([0, 0, 1.0], dtype=np.float32),
            np.array([[-cube_size, -cube_size,  cube_size],
                      [ cube_size, -cube_size,  cube_size],
                      [ cube_size,  cube_size,  cube_size],
                      [-cube_size,  cube_size,  cube_size]], dtype=np.float32),
            create_face_texture("FRONT-3D", (180, 50, 40), pattern="checker")
        ),
        "RIGHT": (
            np.array([1.0, 0, 0], dtype=np.float32),
            np.array([[ cube_size, -cube_size,  cube_size],
                      [ cube_size, -cube_size, -cube_size],
                      [ cube_size,  cube_size, -cube_size],
                      [ cube_size,  cube_size,  cube_size]], dtype=np.float32),
            create_face_texture("RIGHT-3D", (40, 150, 60), pattern="circles")
        ),
        "LEFT": (
            np.array([-1.0, 0, 0], dtype=np.float32),
            np.array([[-cube_size, -cube_size, -cube_size],
                      [-cube_size, -cube_size,  cube_size],
                      [-cube_size,  cube_size,  cube_size],
                      [-cube_size,  cube_size, -cube_size]], dtype=np.float32),
            create_face_texture("LEFT-3D", (190, 120, 20), pattern="cross")
        ),
        "TOP": (
            np.array([0, 1.0, 0], dtype=np.float32),
            np.array([[-cube_size,  cube_size,  cube_size],
                      [ cube_size,  cube_size,  cube_size],
                      [ cube_size,  cube_size, -cube_size],
                      [-cube_size,  cube_size, -cube_size]], dtype=np.float32),
            create_face_texture("TOP-3D", (35, 75, 210), pattern="stripes")
        ),
        "BACK": (
            np.array([0, 0, -1.0], dtype=np.float32),
            np.array([[ cube_size, -cube_size, -cube_size],
                      [-cube_size, -cube_size, -cube_size],
                      [-cube_size,  cube_size, -cube_size],
                      [ cube_size,  cube_size, -cube_size]], dtype=np.float32),
            create_face_texture("BACK-3D", (140, 40, 160), pattern="shapes")
        )
    }

    # Orbital camera angles: -50 deg to +50 deg yaw with alternating pitch elevations
    yaws = np.linspace(-48, 48, num_views)
    pitches = [18 + 7 * np.sin(i * np.pi / (num_views - 1)) for i in range(num_views)]

    print(f"Generating {num_views} true 3D volumetric cube views in {out_path}...")
    for i in range(num_views):
        yaw = float(yaws[i])
        pitch = float(pitches[i])
        scene = render_3d_cube_scene(faces_data, yaw_deg=yaw, pitch_deg=pitch)
        filename = f"view_{i+1:02d}.jpg"
        file_path = out_path / filename
        cv2.imwrite(str(file_path), scene, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  [Created] {filename} (Yaw: {yaw:+.1f} deg, Pitch: {pitch:.1f} deg)")

    print(f"Successfully generated {num_views} multi-view 3D cube photographs.")

if __name__ == "__main__":
    generate_dataset()
