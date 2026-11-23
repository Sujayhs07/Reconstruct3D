import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Layers,
  Download,
  Cpu,
  Info,
  CheckCircle2,
  HardDrive,
  QrCode,
  Smartphone
} from 'lucide-react';
import { getProjectModels, getModelStats, getModelDownloadUrl } from '../api/client';
import Viewer3D from '../components/Viewer3D';
import MobileARModal from '../components/MobileARModal';

export default function ModelViewerPage() {
  const { id } = useParams();
  const [artifacts, setArtifacts] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showARModal, setShowARModal] = useState(false);

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
    return <div className="p-12 text-center text-zinc-500 text-xs font-mono">Loading 3D reconstructed assets...</div>;
  }

  const isPointCloud = selectedArtifact?.artifact_type?.includes('points') || selectedArtifact?.artifact_type?.includes('pcd');

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      {/* 3D Asset Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl surface-panel p-3 border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-400 font-mono uppercase mr-1">
            Generated Assets:
          </span>
          {artifacts.map((art) => {
            const isSelected = selectedArtifact?.id === art.id;
            return (
              <button
                key={art.id}
                onClick={() => setSelectedArtifact(art)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1.5 sm:space-x-2 ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900 border border-zinc-800'
                }`}
              >
                <span className="truncate max-w-[120px] xs:max-w-none">{art.filename}</span>
                <span className={`text-[10px] uppercase px-1 py-0.2 rounded shrink-0 ${isSelected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 text-zinc-500'}`}>
                  {art.format}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedArtifact && (
            <button
              onClick={() => setShowARModal(true)}
              className="btn-primary flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md shadow-blue-500/20 border-0 hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Scan QR Code to place this 3D model on your table in Augmented Reality"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>📱 View in Mobile AR</span>
            </button>
          )}

          {selectedArtifact && (
            <a
              href={getModelDownloadUrl(id, selectedArtifact.filename)}
              download
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {selectedArtifact.format.toUpperCase()}</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile AR QR Code Modal */}
      <MobileARModal
        isOpen={showARModal}
        onClose={() => setShowARModal(false)}
        projectId={id}
        modelName={selectedArtifact?.filename || '3D Object'}
      />

      {/* 3D Viewer Cockpit */}
      <Viewer3D
        modelUrl={selectedArtifact?.file_path}
        format={selectedArtifact?.format || 'ply'}
        isPointCloud={isPointCloud}
        modelName={selectedArtifact?.filename || 'Reconstructed_Model'}
        stats={stats}
        availableArtifacts={artifacts}
        onSelectArtifact={setSelectedArtifact}
      />

      {/* Metadata & Export Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Model Geometry Diagnostics */}
        <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Geometry & Camera Diagnostics</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Registered Photographs</span>
              <span className="text-zinc-100 font-bold text-base">{stats.registered_images || 0}</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Sparse Points (SfM)</span>
              <span className="text-zinc-100 font-bold text-base">{(stats.sparse_points || 0).toLocaleString()}</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Dense Points (MVS)</span>
              <span className="text-blue-400 font-bold text-base">{(stats.dense_points || 0).toLocaleString()}</span>
            </div>

            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg">
              <span className="text-zinc-500 block text-[10px] uppercase">Mesh Triangles</span>
              <span className="text-zinc-100 font-bold text-base">{(stats.mesh_triangles || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Model Downloads & Formats */}
        <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Export Formats & Artifacts</span>
          </h3>

          <div className="space-y-2">
            {artifacts.length > 0 ? (
              artifacts.map((art) => (
                <div
                  key={art.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/80 text-xs font-mono"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="text-zinc-200 font-medium truncate">{art.filename}</div>
                    <div className="text-zinc-500 text-[11px]">
                      {art.artifact_type} · {Math.round(art.file_size / 1024)} KB
                    </div>
                  </div>

                  <a
                    href={getModelDownloadUrl(id, art.filename)}
                    download
                    className="btn-secondary flex items-center space-x-1 px-2.5 py-1 text-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-500 font-mono text-center py-6">
                Run the reconstruction pipeline to export PLY, OBJ, and GLB files.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
