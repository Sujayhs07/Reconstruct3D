import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Image,
  Sparkles,
  Cpu,
  Box,
  Layers,
  ArrowLeft,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { getProject, deleteProject } from '../api/client';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const loadProject = async (isInitial = false) => {
    try {
      if (isInitial && !hasLoadedRef.current) {
        setLoading(true);
      }
      const res = await getProject(id);
      setProject(res.data);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasLoadedRef.current = false;
    loadProject(true);
  }, [id]);

  const navItems = [
    { path: `/projects/${id}/images`, label: 'Acquisition', icon: Image, count: project?.image_count },
    { path: `/projects/${id}/analysis`, label: 'Quality & SIFT', icon: Sparkles },
    { path: `/projects/${id}/reconstruct`, label: 'Reconstruction Pipeline', icon: Cpu },
    { path: `/projects/${id}/models`, label: '3D Viewer', icon: Box, highlight: project?.status === 'completed' },
  ];

  const isActive = (p) => location.pathname.startsWith(p) || (p.endsWith('/models') && location.pathname.startsWith(`/projects/${id}/viewer`));

  const handleDelete = async () => {
    if (!window.confirm('Delete this project permanently?')) return;
    try {
      await deleteProject(id);
      navigate('/');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  if (loading && !project) {
    return (
      <div className="p-12 text-zinc-500 font-mono text-xs text-center">
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-zinc-100">Project Not Found</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This project session may have expired or the cloud container was restarted. You can start a fresh project with one click.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/new" className="btn-primary px-4 py-2 text-xs">
            Create New Project
          </Link>
          <Link to="/" className="btn-secondary px-4 py-2 text-xs">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-4 sm:space-y-6 select-none">
      {/* Project Workspace Header Bar */}
      <div className="rounded-xl surface-panel p-4 sm:p-5 space-y-3.5 sm:space-y-4 border border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-800 pb-3.5 sm:pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <Link
                to="/"
                className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <h1 className="text-sm sm:text-base font-bold text-zinc-100 m-0 tracking-tight truncate max-w-[180px] xs:max-w-xs sm:max-w-none">
                {project.name}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                {project.status.toUpperCase()}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-zinc-400 pl-9 sm:pl-10 line-clamp-2">{project.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end space-x-4 sm:space-x-6 pl-9 md:pl-0">
            <div className="flex items-center space-x-3.5 sm:space-x-5 text-xs font-mono text-zinc-400">
              <div>
                <span className="text-zinc-500 block text-[9px] sm:text-[10px]">PHOTOS</span>
                <span className="text-zinc-200 font-medium">{project.image_count ?? 0}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] sm:text-[10px]">SPARSE PTS</span>
                <span className="text-zinc-200 font-medium">{project.sparse_points_count ?? 0}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[9px] sm:text-[10px]">MESH TRIS</span>
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

        {/* Tab Navigation (Horizontal scrolling on mobile) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-1 text-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
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
      <Outlet context={{ project, reloadProject: () => loadProject(false) }} />
    </div>
  );
}
