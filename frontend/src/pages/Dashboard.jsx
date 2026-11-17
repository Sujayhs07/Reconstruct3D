import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Layers,
  Image,
  Sparkles,
  FolderPlus,
  ArrowRight,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { getProjects, getProjectStatsSummary, deleteProject } from '../api/client';

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
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, statsRes] = await Promise.all([
        getProjects(),
        getProjectStatsSummary()
      ]);
      setProjects(projRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reconstruction project? All associated data and models will be permanently removed.')) {
      return;
    }
    try {
      await deleteProject(id);
      loadData();
    } catch (err) {
      alert('Failed to delete project: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>COMPLETED</span>
          </span>
        );
      case 'reconstructing':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-400 border border-blue-800 animate-pulse">
            <Activity className="w-3 h-3" />
            <span>RECONSTRUCTING</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-red-950 text-red-400 border border-red-800">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800">
            <span>READY</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            <span>CREATED</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2a2e39] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 m-0">
            Reconstruct3D Engineering Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Structure from Motion (SfM) and Multi-View Stereo (MVS) Photogrammetry Pipeline
          </p>
        </div>

        <Link
          to="/new"
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors shadow-sm self-start md:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Project</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Total Projects</span>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total_projects}</div>
          <span className="text-[11px] text-slate-500">{stats.completed_projects} fully reconstructed</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Photographs</span>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total_images}</div>
          <span className="text-[11px] text-slate-500">Acquired across datasets</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">3D Points Generated</span>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {(stats.total_reconstructed_points || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500">Sparse & dense points</span>
        </div>

        <div className="p-4 rounded-lg bg-[#161920] border border-[#2a2e39] space-y-1">
          <span className="text-xs text-slate-400 font-mono uppercase">Meshes Exported</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.total_meshes_generated}</div>
          <span className="text-[11px] text-slate-500">Poisson surface reconstructions</span>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 m-0">Recent Reconstruction Projects</h2>
          <span className="text-xs text-slate-500 font-mono">{projects.length} recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">Loading projects from SQLite...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-lg bg-[#161920] border border-dashed border-[#2a2e39] text-center space-y-3">
            <Box className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">No projects created yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start by creating a new photogrammetry project and uploading real photographs of an object.
            </p>
            <Link
              to="/new"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Project</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}/images`)}
                className="group relative rounded-lg bg-[#161920] border border-[#2a2e39] hover:border-blue-500/50 p-5 cursor-pointer transition-all hover:bg-[#1a1e27] flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                      {proj.name}
                    </h3>
                    {getStatusBadge(proj.status)}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 h-8">
                    {proj.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a2e39] text-[11px] font-mono text-slate-400">
                    <div>
                      <span className="block text-slate-500 text-[10px]">IMAGES</span>
                      <span className="text-slate-200 font-medium">{proj.image_count}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">POINTS</span>
                      <span className="text-slate-200 font-medium">
                        {(proj.dense_point_count || proj.sparse_point_count || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 text-[10px]">MESH TRIS</span>
                      <span className="text-slate-200 font-medium">
                        {(proj.mesh_triangle_count || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2a2e39] flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center space-x-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(proj.updated_at).toLocaleDateString()}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      title="Delete project"
                      className="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center text-[11px]">
                      Open <ArrowRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
