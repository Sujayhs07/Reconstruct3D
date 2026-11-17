import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Image,
  Sparkles,
  Cpu,
  Box,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
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
    { path: `/projects/${id}/images`, label: 'Image Acquisition', icon: Image, count: project?.image_count },
    { path: `/projects/${id}/analysis`, label: 'Image Analysis', icon: Sparkles },
    { path: `/projects/${id}/reconstruct`, label: 'Reconstruction Pipeline', icon: Cpu },
    { path: `/projects/${id}/viewer`, label: '3D Interactive Viewer', icon: Box, highlight: project?.status === 'completed' },
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
    return <div className="max-w-7xl mx-auto px-4 py-12 text-slate-500 font-mono text-xs text-center">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-slate-300 text-sm">Project not found.</p>
        <Link to="/" className="text-blue-400 text-xs hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Project Navigation Top Bar */}
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <Link to="/" className="text-slate-400 hover:text-white transition-colors" title="Back to Dashboard">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-lg font-bold text-slate-100 m-0">{project.name}</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                {project.status.toUpperCase()}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-slate-400 pl-7">{project.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-4 pl-7 md:pl-0">
            <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
              <div>
                <span className="text-slate-500">Photos: </span>
                <span className="text-slate-200 font-medium">{project.image_count}</span>
              </div>
              <div>
                <span className="text-slate-500">Sparse: </span>
                <span className="text-slate-200 font-medium">{(project.sparse_point_count || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Dense: </span>
                <span className="text-slate-200 font-medium">{(project.dense_point_count || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Mesh Tris: </span>
                <span className="text-slate-200 font-medium">{(project.mesh_triangle_count || 0).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleDelete}
              title="Delete project"
              className="p-1.5 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="flex items-center space-x-2 mt-4 overflow-x-auto text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : item.highlight
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2e39]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${active ? 'bg-blue-800 text-white' : 'bg-[#0f1115] text-slate-400'}`}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Outlet for Child Workspace Routes */}
      <div>
        <Outlet context={{ project, reloadProject: loadProject }} />
      </div>
    </div>
  );
}
