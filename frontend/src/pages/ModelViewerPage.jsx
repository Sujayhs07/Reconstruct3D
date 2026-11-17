import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Layers,
  Download,
  Share2,
  Cpu,
  Info,
  CheckCircle2,
  FileCode,
  HardDrive
} from 'lucide-react';
import { getProjectModels, getModelStats, getModelDownloadUrl } from '../api/client';
import Viewer3D from '../components/Viewer3D';

export default function ModelViewerPage() {
  const { id } = useParams();
  const [artifacts, setArtifacts] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [artsRes, statsRes] = await Promise.all([
          getProjectModels(id),
          getModelStats(id)
        ]);
        setArtifacts(artsRes.data);
        setStats(statsRes.data);

        // Prefer GLB mesh or PLY mesh if available, else dense/sparse point cloud
        const glb = artsRes.data.find((a) => a.format === 'glb');
        const mesh = artsRes.data.find((a) => a.artifact_type === 'model_mesh' && a.format === 'ply');
        const cleanedPcd = artsRes.data.find((a) => a.artifact_type === 'cleaned_points');
        const sparsePcd = artsRes.data.find((a) => a.artifact_type === 'sparse_points');

        setSelectedArtifact(glb || mesh || cleanedPcd || sparsePcd || artsRes.data[0] || null);
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs font-mono">Loading 3D reconstructed assets...</div>;
  }

  if (artifacts.length === 0) {
    return (
      <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-12 text-center space-y-3">
        <Box className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-200">No Reconstructed Models Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please run the photogrammetry reconstruction pipeline first to generate sparse/dense point clouds and 3D meshes.
        </p>
        <Link
          to={`/projects/${id}/reconstruct`}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
        >
          <Cpu className="w-4 h-4" />
          <span>Go to Reconstruction Pipeline</span>
        </Link>
      </div>
    );
  }

  const isPointCloud = selectedArtifact?.artifact_type?.includes('points') || selectedArtifact?.artifact_type?.includes('pcd');

  return (
    <div className="space-y-6">
      {/* 3D Asset Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161920] border border-[#2a2e39] rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 font-mono uppercase mr-1">
            Reconstructed Assets:
          </span>
          {artifacts.map((art) => {
            const isSelected = selectedArtifact?.id === art.id;
            return (
              <button
                key={art.id}
                onClick={() => setSelectedArtifact(art)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#0f1115] text-slate-300 hover:bg-[#2a2e39] border border-[#2a2e39]'
                }`}
              >
                <span>{art.filename}</span>
                <span className={`text-[10px] uppercase px-1 py-0.2 rounded ${isSelected ? 'bg-blue-800' : 'bg-[#1e222b] text-slate-400'}`}>
                  {art.format}
                </span>
              </button>
            );
          })}
        </div>

        {selectedArtifact && (
          <a
            href={getModelDownloadUrl(id, selectedArtifact.filename)}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1e222b] hover:bg-[#2a2e39] border border-[#2a2e39] text-slate-200 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Download {selectedArtifact.format.toUpperCase()}</span>
          </a>
        )}
      </div>

      {/* Interactive 3D Viewer Canvas */}
      {selectedArtifact && (
        <Viewer3D
          modelUrl={selectedArtifact.file_path}
          format={selectedArtifact.format}
          isPointCloud={isPointCloud}
          modelName={selectedArtifact.filename}
          stats={stats}
        />
      )}

      {/* Model Export & Statistics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Geometry Diagnostics */}
        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Model Geometry Metadata</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-500 block text-[11px]">Registered Photographs</span>
              <span className="text-slate-200 font-semibold text-base">{stats.registered_images || 0}</span>
            </div>

            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-500 block text-[11px]">Sparse Points (SfM)</span>
              <span className="text-slate-200 font-semibold text-base">{(stats.sparse_points || 0).toLocaleString()}</span>
            </div>

            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-500 block text-[11px]">Dense Points (MVS)</span>
              <span className="text-emerald-400 font-semibold text-base">{(stats.dense_points || 0).toLocaleString()}</span>
            </div>

            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded">
              <span className="text-slate-500 block text-[11px]">Mesh Triangles</span>
              <span className="text-purple-400 font-semibold text-base">{(stats.mesh_triangles || 0).toLocaleString()}</span>
            </div>
          </div>

          {stats.point_cloud_stats && stats.point_cloud_stats.bounds_min && (
            <div className="p-3 bg-[#0f1115] border border-[#2a2e39] rounded space-y-1 text-xs font-mono text-slate-400">
              <span className="text-slate-500 block text-[10px] uppercase">Axis-Aligned Bounding Box (AABB)</span>
              <div>Min: [{stats.point_cloud_stats.bounds_min.join(', ')}]</div>
              <div>Max: [{stats.point_cloud_stats.bounds_max.join(', ')}]</div>
              <div>Center: [{stats.point_cloud_stats.center.join(', ')}]</div>
            </div>
          )}
        </div>

        {/* Model Downloads & Formats */}
        <div className="bg-[#161920] border border-[#2a2e39] rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Export Formats & Downloads</span>
          </h3>

          <div className="space-y-2">
            {artifacts.map((art) => (
              <div
                key={art.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[#2a2e39] bg-[#0f1115] text-xs font-mono"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="text-slate-200 font-medium truncate">{art.filename}</div>
                  <div className="text-slate-500 text-[11px]">
                    {art.artifact_type} · {Math.round(art.file_size / 1024)} KB
                  </div>
                </div>

                <a
                  href={getModelDownloadUrl(id, art.filename)}
                  download
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded text-xs transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
