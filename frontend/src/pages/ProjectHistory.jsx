import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  Search,
  Box,
  Trash2,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle
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
    <div className="p-8 max-w-[1300px] mx-auto space-y-6 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <FolderArchive className="w-5 h-5 text-zinc-400" />
            <span>Project History</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Archived photogrammetry runs and generated 3D models persisted in SQLite.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-xs font-mono">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 text-xs surface-panel border border-white/[0.08] rounded-xl">
          No matching projects found.
        </div>
      ) : (
        <div className="rounded-xl surface-panel border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] bg-zinc-950/60">
                  <th className="py-3 px-4 font-medium">Project Name</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Photos</th>
                  <th className="py-3 px-4 font-medium">Sparse Points</th>
                  <th className="py-3 px-4 font-medium">Dense Points</th>
                  <th className="py-3 px-4 font-medium">Mesh Triangles</th>
                  <th className="py-3 px-4 font-medium">Created Date</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((proj) => (
                  <tr
                    key={proj.id}
                    onClick={() => navigate(`/projects/${proj.id}/reconstruct`)}
                    className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-100 font-sans">{proj.name}</div>
                      {proj.description && (
                        <div className="text-[11px] text-zinc-500 truncate max-w-xs">{proj.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono ${
                        proj.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : proj.status === 'failed'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                      }`}>
                        {proj.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-200">{proj.image_count ?? 0}</td>
                    <td className="py-3.5 px-4 text-zinc-300">{(proj.sparse_points_count ?? 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-blue-400">{(proj.dense_points_count ?? 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-zinc-200">{(proj.mesh_triangles_count ?? 0).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : '11/17/2026'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/projects/${proj.id}/reconstruct`}
                          className="btn-secondary px-2.5 py-1 text-xs"
                        >
                          Open
                        </Link>
                        <button
                          onClick={(e) => handleDelete(proj.id, e)}
                          className="p-1 rounded hover:bg-rose-950/50 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
