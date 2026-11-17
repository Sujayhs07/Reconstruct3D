import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Box,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers
} from 'lucide-react';
import { getProjects, deleteProject } from '../api/client';

export default function ProjectHistory() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      loadProjects();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2e39] pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center space-x-2 m-0">
            <History className="w-5 h-5 text-blue-500" />
            <span>Reconstruction Project History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Archived photogrammetry runs and generated 3D models persisted in SQLite.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161920] border border-[#2a2e39] focus:border-blue-500 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-[#161920] border border-[#2a2e39] rounded-lg">
          No matching reconstruction projects found.
        </div>
      ) : (
        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead>
                <tr className="border-b border-[#2a2e39] text-slate-500 text-[11px] bg-[#111318]">
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Photos</th>
                  <th className="py-3 px-4">Sparse Points</th>
                  <th className="py-3 px-4">Dense Points</th>
                  <th className="py-3 px-4">Mesh Triangles</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222b]">
                {filtered.map((proj) => (
                  <tr
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}/images`)}
                    className="hover:bg-[#1b2029] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 truncate max-w-xs">{proj.name}</div>
                      {proj.description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{proj.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        proj.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : proj.status === 'reconstructing'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse'
                          : proj.status === 'failed'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {proj.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">{proj.image_count}</td>
                    <td className="py-3 px-4">{(proj.sparse_point_count || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-400">{(proj.dense_point_count || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-purple-400">{(proj.mesh_triangle_count || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(proj.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {proj.status === 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${proj.id}/viewer`);
                          }}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded text-[11px] transition-colors"
                        >
                          View 3D
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(proj.id, e)}
                        title="Delete project"
                        className="p-1 hover:bg-red-950/60 rounded text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
