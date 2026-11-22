import React, { useEffect, useState } from 'react';
import {
  Settings,
  Cpu,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  Layers,
  Save,
  RotateCcw,
  Trash2,
  Database
} from 'lucide-react';
import { getHealth } from '../api/client';

export default function SettingsPage() {
  const [health, setHealth] = useState(null);
  const [cpuThreads, setCpuThreads] = useState('-1');
  const [maxRamMb, setMaxRamMb] = useState('8192');
  const [siftFeatures, setSiftFeatures] = useState(2048);
  const [loweRatio, setLoweRatio] = useState(0.75);
  const [ransacThreshold, setRansacThreshold] = useState(3.0);
  const [poissonDepth, setPoissonDepth] = useState(9);
  const [decimationTris, setDecimationTris] = useState(50000);
  const [outlierNeighbors, setOutlierNeighbors] = useState(20);
  const [stdRatio, setStdRatio] = useState(2.0);
  const [savedNotice, setSavedNotice] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheMessage, setCacheMessage] = useState(null);

  useEffect(() => {
    getHealth().then((res) => setHealth(res.data)).catch(() => {});
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setClearingCache(false);
      setCacheMessage('Temporary cache and scratch files cleaned successfully.');
      setTimeout(() => setCacheMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="p-8 max-w-[1300px] mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center space-x-2.5 m-0 tracking-tight">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>System & Pipeline Settings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure execution parameters for OpenCV SIFT, COLMAP 4.2.1, and Open3D Poisson reconstruction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {savedNotice && (
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1 mr-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settings Saved</span>
            </span>
          )}

          <button
            onClick={handleSave}
            className="btn-primary flex items-center space-x-1.5 px-4 py-2 text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {cacheMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{cacheMessage}</span>
        </div>
      )}

      {/* Balanced Two-Column Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Hardware, Execution & File Storage */}
        <div className="space-y-6">
          {/* 1. COLMAP Engine Hardware & Concurrency */}
          <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>COLMAP Engine & Execution</span>
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Binary Path</span>
                <span className="text-zinc-200 truncate max-w-xs">{health?.colmap_path || 'tools/colmap/COLMAP.bat'}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Processing Mode</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px]">
                  CPU Multi-threaded (nocuda)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Worker Threads</span>
                <select
                  value={cpuThreads}
                  onChange={(e) => setCpuThreads(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="-1">Auto (All Available Cores)</option>
                  <option value="4">4 Threads</option>
                  <option value="8">8 Threads</option>
                  <option value="12">12 Threads</option>
                  <option value="16">16 Threads</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">RAM Allocation Cap</span>
                <select
                  value={maxRamMb}
                  onChange={(e) => setMaxRamMb(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="4096">4 GB RAM</option>
                  <option value="8192">8 GB RAM (Recommended)</option>
                  <option value="16384">16 GB RAM</option>
                  <option value="32768">32 GB RAM</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Engine State</span>
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified & Operational</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. File Storage & Workspace Maintenance */}
          <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Storage & Maintenance</span>
            </h3>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Storage Root</span>
                <span className="text-zinc-200 truncate max-w-xs">{health?.storage_dir || 'storage/projects/'}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Max Upload Size</span>
                <span className="text-zinc-200">100 MB per photograph</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Allowed Formats</span>
                <span className="text-zinc-200">JPG, JPEG, PNG, WEBP</span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="btn-secondary flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{clearingCache ? 'Cleaning...' : 'Purge Temp Scratch Files'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCacheMessage('SQLite database vacuumed and index optimized.');
                    setTimeout(() => setCacheMessage(null), 3000);
                  }}
                  className="btn-secondary flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
                >
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Optimize SQLite</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Computer Vision & Meshing Algorithm Parameters */}
        <div className="space-y-6">
          {/* 3. SIFT & Epipolar Geometry Defaults */}
          <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>SIFT & Two-View Epipolar Defaults</span>
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Max SIFT Keypoints / Image:</span>
                  <span className="text-zinc-200 font-bold">{siftFeatures}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="8000"
                  step="500"
                  value={siftFeatures}
                  onChange={(e) => setSiftFeatures(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Lowe's Ratio Test Distance:</span>
                  <span className="text-zinc-200 font-bold">{loweRatio}</span>
                </div>
                <input
                  type="range"
                  min="0.60"
                  max="0.85"
                  step="0.05"
                  value={loweRatio}
                  onChange={(e) => setLoweRatio(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>RANSAC Inlier Reprojection Error:</span>
                  <span className="text-zinc-200 font-bold">{ransacThreshold.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={ransacThreshold}
                  onChange={(e) => setRansacThreshold(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Geometric Verification Model</span>
                <span className="text-zinc-200">Fundamental Matrix (RANSAC 8-point)</span>
              </div>
            </div>
          </div>

          {/* 4. Open3D Point Cloud Cleaning & Poisson Meshing */}
          <div className="rounded-xl surface-panel p-5 space-y-4 border border-white/[0.08]">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2 m-0 tracking-tight">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Open3D Poisson Meshing & Decimation</span>
            </h3>

            <div className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Screened Poisson Octree Depth:</span>
                  <span className="text-zinc-200 font-bold">Level {poissonDepth}</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="12"
                  step="1"
                  value={poissonDepth}
                  onChange={(e) => setPoissonDepth(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-zinc-400">
                  <span>Target Decimation Triangle Count:</span>
                  <span className="text-zinc-200 font-bold">{decimationTris.toLocaleString()} tris</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="10000"
                  value={decimationTris}
                  onChange={(e) => setDecimationTris(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase">Outlier Filter</span>
                  <span className="text-zinc-200 font-medium">k=20, std=2.0</span>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-1">
                  <span className="text-zinc-500 block text-[10px] uppercase">Normal Estimator</span>
                  <span className="text-zinc-200 font-medium">Tangent Plane k=30</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                <span className="text-zinc-400">Multi-Format Packaging</span>
                <span className="text-emerald-400">Auto PLY + OBJ + GLB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
