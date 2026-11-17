"""
End-to-end test of the Reconstruct3D backend pipeline using the generated sample dataset.
"""
import sys
import time
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database import SessionLocal
from backend.models import Project, ProjectImage
from backend.services.file_service import init_project_directories, calculate_file_hash, get_relative_url
from backend.services.cv_service import CVService
from backend.services.job_manager import job_manager

def test_pipeline():
    db = SessionLocal()
    # 1. Create project
    proj = Project(name="E2E Pipeline Test", description="Automated test with 8 sample viewpoints")
    db.add(proj)
    db.commit()
    db.refresh(proj)
    project_id = proj.id
    print(f"[1] Created project {project_id}")

    # 2. Add sample images
    dirs = init_project_directories(project_id)
    sample_files = sorted(list(Path("data/sample_cube").glob("*.jpg")))
    print(f"[2] Copying {len(sample_files)} sample photographs into source_images...")

    for f in sample_files:
        with open(f, "rb") as fp:
            data = fp.read()
        dest = dirs["source_images"] / f.name
        with open(dest, "wb") as fp:
            fp.write(data)

        analysis = CVService.analyze_image_quality(data, f.name)
        _, _, kp_count = CVService.extract_sift_features(dest, n_features=1500)

        img_obj = ProjectImage(
            project_id=project_id,
            filename=f.name,
            original_filename=f.name,
            file_path=get_relative_url(dest),
            width=analysis["width"],
            height=analysis["height"],
            file_size=analysis["file_size"],
            format=analysis["format"],
            avg_brightness=analysis["avg_brightness"],
            contrast=analysis["contrast"],
            sharpness=analysis["sharpness"],
            is_blurry=analysis["is_blurry"],
            is_dark=analysis["is_dark"],
            is_low_res=analysis["is_low_res"],
            keypoint_count=kp_count,
            file_hash=calculate_file_hash(data)
        )
        db.add(img_obj)

    proj.image_count = len(sample_files)
    proj.status = "ready"
    db.commit()
    print(f"[3] Images added. Starting pipeline reconstruction...")

    # 3. Start reconstruction thread
    job_manager.start_reconstruction(
        project_id=project_id,
        run_dense=True,
        run_mesh=True,
        poisson_depth=8,
        decimation_triangles=20000
    )

    # 4. Monitor until completion or failure
    while job_manager.is_running(project_id):
        time.sleep(2)
        db.refresh(proj)
        print(f"  Stage: {proj.active_stage} ({int(proj.stage_progress * 100)}%) | Sparse: {proj.sparse_point_count} | Dense: {proj.dense_point_count}")

    db.refresh(proj)
    print(f"\n[4] Finished with status: {proj.status}")
    print(f"  Registered Images: {proj.registered_image_count}")
    print(f"  Sparse Points: {proj.sparse_point_count}")
    print(f"  Dense Points: {proj.dense_point_count}")
    print(f"  Mesh Vertices: {proj.mesh_vertex_count}")
    print(f"  Mesh Triangles: {proj.mesh_triangle_count}")
    if proj.error_message:
        print(f"  Error: {proj.error_message}")

    db.close()

if __name__ == "__main__":
    test_pipeline()
