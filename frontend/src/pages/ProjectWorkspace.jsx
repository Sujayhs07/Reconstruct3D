import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Image,
  Sparkles,
  Cpu,
  Box,
  Layers,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { getProject, deleteProject } from '../api/client';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await getProject(id);
      setProject(res.data);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const navItems = [
    { path: `/projects/${id}/images`, label: 'Acquisition', icon: Image, count: project?.image_count },
    { path: `/projects/${id}/analysis`, label: 'Quality & SIFT', icon: Sparkles },
    { path: `/projects/${id}/reconstruct`, label: 'Reconstruction Pipeline', icon: Cpu },
    { path: `/projects/${id}/models`, label: '3D Viewer', icon: Box, highlight: project?.status === 'completed' },
  ];

  const isActive = (p) => location.pathname.startsWith(p);

  const handleDelete = async () => {
    if (!window.confirm('Delete this project permanently?')) return;
    try {
      await deleteProject(id);
      navigate('/');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-12 text-zinc-500 font-mono text-xs text-center">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-zinc-300 text-sm">Project not found.</p>
        <Link to="/" className="text-blue-400 text-xs hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1300px] mx-auto space-y-6 select-none">
      {/* Project Workspace Header Bar */}
      <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <Link
                to="/"
                className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <h1 className="text-base font-bold text-zinc-100 m-0 tracking-tight">{project.name}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {project.status.toUpperCase()}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-zinc-400 pl-10">{project.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-6 pl-10 md:pl-0">
            <div className="flex items-center space-x-5 text-xs font-mono text-zinc-400">
              <div>
                <span className="text-zinc-500 block text-[10px]">PHOTOS</span>
                <span className="text-zinc-200 font-medium">{project.image_count}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">SPARSE PTS</span>
                <span className="text-zinc-200 font-medium">{project.sparse_points_count ?? 0}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">MESH TRIS</span>
                <span className="text-zinc-200 font-medium">{project.mesh_triangles_count ?? 0}</span>
              </div>
            </div>

            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-rose-950/50 text-zinc-500 hover:text-rose-400 border border-transparent hover:border-rose-900/40 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${active ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-500'}`}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Outlet Sub-pages */}
      <Outlet context={{ project, reloadProject: loadProject }} />
    </div>
  );
}
