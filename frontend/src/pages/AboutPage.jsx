import React from 'react';
import { Info, Box, Cpu, Sparkles, Layers, ShieldCheck, CheckCircle2, BookOpen, Camera, Terminal } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="p-8 max-w-[1300px] mx-auto space-y-6 select-none">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold text-zinc-100 flex items-center space-x-2.5 m-0 tracking-tight">
          <Info className="w-5 h-5 text-blue-400" />
          <span>About Reconstruct3D</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Computer Graphics and Image Processing (CGIP) photogrammetry architecture, mathematical foundations, and system reference.
        </p>
      </div>

      {/* Balanced Two-Column Technical Documentation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Pipeline Stages & Mathematical Formulations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Architecture Overview */}
          <div className="rounded-xl surface-panel p-6 space-y-4 border border-white/[0.08]">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Photogrammetry Pipeline Stages</span>
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reconstruct3D converts arbitrary 2D camera photographs of physical objects into dense 3D point clouds and watertight Poisson meshes using verified algorithms:
              </p>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono text-blue-400">01</span>
                  <span>SIFT Scale-Invariant Feature Detection & 128D Descriptors</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                  Computes Difference of Gaussians (DoG) pyramid across scale-space to identify scale- and rotation-invariant extrema. Generates 128-dimensional gradient orientation histograms per keypoint.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono text-indigo-400">02</span>
                  <span>Two-View Exhaustive Matching & RANSAC Geometric Verification</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                  Performs k-nearest neighbors matching with Lowe's ratio test (threshold 0.75). Enforces epipolar geometry by estimating the Fundamental Matrix using RANSAC to eliminate false correspondence outliers.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono text-sky-400">03</span>
                  <span>Incremental Structure from Motion (COLMAP SfM)</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                  Selects initial two-view reconstruction pair with broad baseline and high parallax. Alternates between camera resectioning (PnP pose estimation), triangulation of 3D points, and global Bundle Adjustment (Ceres Solver).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono text-emerald-400">04</span>
                  <span>Multi-View Stereo (PatchMatch MVS) & Point Fusion</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                  Undistorts original photographs using estimated radial/tangential distortion coefficients. Computes pixelwise photometric and geometric consistency depth maps with PatchMatch stereo and fuses them into a dense point cloud.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-[10px] font-mono text-purple-400">05</span>
                  <span>Open3D Screened Poisson Surface Meshing</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed pl-7">
                  Calculates oriented surface normals using tangent plane consistency. Solves the Poisson indicator equation on an adaptive octree (depth 9). Trims low-density boundary artifacts and decimates to 50,000 triangular faces.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Formulations */}
          <div className="rounded-xl surface-panel p-6 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Core Mathematical Formulations</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase">Epipolar Constraint</span>
                <span className="text-blue-400 font-bold block text-sm">x'^T · F · x = 0</span>
                <p className="text-zinc-500 text-[11px] font-sans">
                  Relates corresponding points between two views via Fundamental Matrix F.
                </p>
              </div>

              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase">Bundle Adjustment</span>
                <span className="text-indigo-400 font-bold block text-sm">min Σ ||x_ij - π(P_i, X_j)||^2</span>
                <p className="text-zinc-500 text-[11px] font-sans">
                  Non-linear least squares minimization of 2D reprojection errors across all cameras.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): System Stack & Field Capture Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Engineering Stack Specifications */}
          <div className="rounded-xl surface-panel p-6 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>System & Software Architecture</span>
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Frontend UI</span>
                <span className="text-zinc-200">React 19 · Vite 8 · Tailwind</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">3D WebGL Canvas</span>
                <span className="text-zinc-200">Three.js 0.187 · R3F · Drei</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Backend Server</span>
                <span className="text-zinc-200">FastAPI 0.115 · Uvicorn</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Computer Vision</span>
                <span className="text-blue-400">OpenCV 4.10 · NumPy</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Photogrammetry Engine</span>
                <span className="text-emerald-400">COLMAP 4.2.1 CPU</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Point & Mesh Processing</span>
                <span className="text-purple-400">Open3D 0.19 · Trimesh</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Metadata Database</span>
                <span className="text-zinc-200">SQLite 3 (ACID, WAL mode)</span>
              </div>
            </div>
          </div>

          {/* Photogrammetry Field Capture Protocol */}
          <div className="rounded-xl surface-panel p-6 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Acquisition Protocols & Tips</span>
            </h3>

            <div className="space-y-3 text-xs text-zinc-400 leading-relaxed font-sans">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Visual Overlap:</strong> Maintain 60%–80% overlap between adjacent photographs for robust SIFT inlier correspondences.
                </span>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Concentric Elevation Rings:</strong> Capture at least 2 to 3 circular loops around the object (eye-level, 30° elevation, 60° elevation).
                </span>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Avoid Specular Glare:</strong> Use diffuse ambient light rather than harsh direct flash to preserve natural surface albedo.
                </span>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-200">Sharp Focus:</strong> Reconstruct3D automatically measures Laplacian variance to flag blurry images during ingest.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
