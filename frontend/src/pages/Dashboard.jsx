/**
 * Dashboard & Workspace Overview Page
 * -----------------------------------
 * Why this matters:
 * The Dashboard is the primary entrypoint for users upon launching the application:
 * 1. Global Metrics: Displays aggregate statistics across all projects (total scans,
 *    reconstructed 3D point cloud volumes, meshes, and images processed).
 * 2. Active Projects Grid: Lists all existing projects with status indicators (completed,
 *    in-progress, created) and quick-action links.
 * 3. 3D Hero Scene: Renders an interactive Three.js stylized classical temple / architectural
 *    point cloud mesh in the header to demonstrate the platform's visual capability.
 * 4. Empty-State Guidance: When zero projects exist, guides the user cleanly with a prominent
 *    "Create First Project" call-to-action.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Folder,
  Image as ImageIcon,
  Box,
  Clock,
  ArrowRight,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Camera,
  Cpu,
  Zap,
  ChevronRight
} from 'lucide-react';
import { getProjects, getProjectStatsSummary } from '../api/client';
import TempleHeroScene from '../components/TempleHeroScene';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    total_projects: 0,
    completed_projects: 0,
    total_images: 0,
    total_reconstructed_points: 0,
    total_meshes_generated: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, statsRes] = await Promise.all([
          getProjects(),
          getProjectStatsSummary()
        ]);
        setProjects(projRes.data);
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1" />
            <span>Failed</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1" />
            <span>Completed</span>
          </span>
        );
      case 'reconstructing':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1" />
            <span>Processing</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1" />
            <span>Created</span>
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '11/17/2026';
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return '11/17/2026';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6 sm:space-y-8 select-none">
      {/* 1. Hero Section matching Image 1 (Unslopped Senior Engineer Craft) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center pt-1">
        <div className="lg:col-span-7 xl:col-span-6 space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-100 tracking-tight leading-tight m-0">
              Reconstruct3D
              <br />
              <span className="text-zinc-200">Engineering Studio</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl">
              Structure from Motion (SfM) and Multi-View Stereo (MVS) Photogrammetry Pipeline
            </p>
          </div>

          <div className="pt-1">
            <Link
              to="/new"
              className="btn-primary inline-flex items-center space-x-2 px-4 py-2 text-xs"
            >
              <span>Create New Project</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Hero 3D Photogrammetry Point Cloud Viewer with Corner Marks */}
        <div className="lg:col-span-5 xl:col-span-6">
          <TempleHeroScene />
        </div>
      </div>

      {/* 2. Stat Cards Row matching Image 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Projects */}
        <div className="surface-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Folder className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {stats.total_projects ?? 0}
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                Total Projects
              </div>
            </div>
          </div>
          <div className="self-start text-[10px] font-mono text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
            Active
          </div>
        </div>

        {/* Card 2: Photographs */}
        <div className="surface-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {stats.total_images ?? 0}
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                Photographs
              </div>
            </div>
          </div>
          <div className="self-start text-[10px] font-mono text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
            ↑ +2
          </div>
        </div>

        {/* Card 3: 3D Points Generated */}
        <div className="surface-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Box className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {stats.total_reconstructed_points?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                3D Points Generated
              </div>
            </div>
          </div>
          <div className="self-start text-[10px] font-mono text-zinc-600 px-1.5 py-0.5">
            —
          </div>
        </div>

        {/* Card 4: Meshes Exported */}
        <div className="surface-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Clock className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {stats.total_meshes_generated ?? 0}
              </div>
              <div className="text-xs text-zinc-400 font-medium">
                Meshes Exported
              </div>
            </div>
          </div>
          <div className="self-start text-[10px] font-mono text-zinc-600 px-1.5 py-0.5">
            —
          </div>
        </div>
      </div>

      {/* 3. Recent Reconstruction Projects matching Image 1 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight m-0">
              Recent Reconstruction Projects
            </h2>
          </div>

          <Link
            to="/history"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 transition-colors"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grid of Projects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 6).map((project) => (
            <div
              key={project.id}
              className="surface-card p-4 flex flex-col justify-between group"
            >
              <div>
                {/* Header with Title and Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-zinc-100 truncate max-w-[170px]">
                    {project.name}
                  </h3>
                  {getStatusBadge(project.status)}
                </div>

                {/* Thumbnail and Details Row */}
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-18 h-18 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <Box className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-400">
                      <div>
                        <span className="block text-zinc-500">PHOTOS</span>
                        <span className="text-zinc-200 font-medium">{project.image_count ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500">POINTS</span>
                        <span className="text-zinc-200 font-medium">{project.sparse_points_count ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500">MESH TRIS</span>
                        <span className="text-zinc-200 font-medium">{project.mesh_triangles_count ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer with Date and Open Button */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
                <div className="flex items-center space-x-1.5 text-zinc-500 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                  <span>{formatDate(project.created_at)}</span>
                </div>

                <Link
                  to={`/projects/${project.id}/images`}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  <span>Open →</span>
                </Link>
              </div>
            </div>
          ))}

          {/* Clean Empty State when zero projects exist */}
          {projects.length === 0 && (
            <div className="col-span-full rounded-xl surface-card p-8 sm:p-12 text-center space-y-4 border border-dashed border-zinc-800/80">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Box className="w-6 h-6 text-blue-400" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-sm font-semibold text-zinc-100">No Reconstruction Projects Yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Start by uploading overlapping photographs of any physical object or capturing images with your camera.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/new"
                  className="btn-primary inline-flex items-center space-x-2 px-4 py-2 text-xs"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Create First Project</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Pipeline Banner matching Image 1 */}
      <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 border border-white/[0.08]">
        <div className="space-y-1 max-w-xl">
          <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase block">
            Powerful Pipeline
          </span>
          <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
            From Photos to 3D Models
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Reconstruct detailed 3D models using state-of-the-art computer vision techniques.
          </p>
        </div>

        {/* Stepper with icons (smoothly horizontally scrollable on mobile) */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center space-x-2 text-zinc-300 shrink-0">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="font-medium text-xs">Upload</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

          <div className="flex items-center space-x-2 text-zinc-300 shrink-0">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="font-medium text-xs">AI 3D Engine</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

          <div className="flex items-center space-x-2 text-zinc-300 shrink-0">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Box className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <span className="font-medium text-xs">3D Mesh</span>
          </div>
        </div>

        <Link
          to="/new"
          className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2 text-xs shrink-0 self-start md:self-center"
        >
          <span>Start Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
