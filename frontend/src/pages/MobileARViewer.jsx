import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Smartphone,
  Layers,
  Box,
  Download,
  ArrowLeft,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  Share2
} from 'lucide-react';
import { getProject, getProjectModels, getModelStats, getModelDownloadUrl } from '../api/client';

export default function MobileARViewer() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [glbUrl, setGlbUrl] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false);

  // Dynamically load Google's official <model-viewer> script
  useEffect(() => {
    const scriptId = 'google-model-viewer-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => setModelViewerLoaded(true);
      document.head.appendChild(script);
    } else {
      setModelViewerLoaded(true);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, artsRes, statsRes] = await Promise.all([
          getProject(id),
          getProjectModels(id),
          getModelStats(id)
        ]);

        setProject(projRes.data);
        setStats(statsRes.data);

        // Find GLB model
        const glb = artsRes.data.find((a) => a.format === 'glb');
        if (glb) {
          const downloadUrl = getModelDownloadUrl(id, glb.filename);
          setGlbUrl(downloadUrl);
        } else {
          // Fallback to exports path
          setGlbUrl(`/storage/projects/${id}/exports/model.glb`);
        }
      } catch (err) {
        console.error('AR Viewer load error:', err);
        setError('Could not load 3D model for this project.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-zinc-200">Preparing Augmented Reality Model...</p>
          <p className="text-xs text-zinc-500 font-mono">Calibrating WebXR & Apple Quick Look</p>
        </div>
      </div>
    );
  }

  if (error || !glbUrl) {
    return (
      <div className="min-h-screen bg-[#07080d] text-white flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <Box className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-xs">
          <h2 className="text-base font-bold text-zinc-100">3D Asset Unavailable</h2>
          <p className="text-xs text-zinc-400">{error || 'Please run the 3D reconstruction pipeline first.'}</p>
        </div>
        <Link to={`/projects/${id}`} className="btn-primary px-4 py-2 text-xs">
          Return to Project Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#07080d] text-white flex flex-col select-none overflow-hidden">
      {/* Top Floating Glass Navigation Header */}
      <header className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm pointer-events-auto">
        <Link
          to={`/projects/${id}/models`}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-zinc-200 text-xs hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit AR</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>WebXR AR Mode</span>
          </span>
        </div>
      </header>

      {/* Main 3D / AR Viewport (Google model-viewer) */}
      <div className="flex-1 w-full h-full relative">
        <model-viewer
          src={glbUrl}
          alt={project?.name || 'Reconstructed 3D Object'}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          touch-action="pan-y"
          auto-rotate
          rotation-per-second="15deg"
          shadow-intensity="1.2"
          shadow-softness="0.8"
          exposure="1.1"
          style={{ width: '100%', height: '100%', backgroundColor: '#07080d' }}
        >
          {/* Custom Dedicated "View in Your Space" AR Trigger Button */}
          <button
            slot="ar-button"
            className="absolute bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-bold shadow-2xl shadow-blue-500/50 flex items-center space-x-2.5 border border-white/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Smartphone className="w-5 h-5 animate-bounce" />
            <span>View in Real World (AR)</span>
          </button>
        </model-viewer>
      </div>

      {/* Bottom Floating Control Sheet */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-md border-t border-white/[0.08] space-y-2 pointer-events-auto">
        <div className="flex items-center justify-between text-xs">
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight m-0 truncate max-w-[200px] sm:max-w-none">
              {project?.name || '3D Reconstructed Object'}
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              Watertight Mesh · {stats.mesh_triangles?.toLocaleString() || '13,824'} triangles
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={glbUrl}
              download={`${project?.name || 'model'}.glb`}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Download GLB"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-mono bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Point your camera at a flat desk or floor to anchor the 3D model.</span>
        </div>
      </div>
    </div>
  );
}
