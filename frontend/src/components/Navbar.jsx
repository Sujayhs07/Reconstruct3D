import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Layers, History, PlusCircle, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';
import { getHealth } from '../api/client';

export default function Navbar() {
  const location = useLocation();
  const [health, setHealth] = useState({ colmap_available: false, online: false });

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await getHealth();
        if (mounted) {
          setHealth({
            online: true,
            colmap_available: res.data.colmap_available,
            colmap_path: res.data.colmap_path
          });
        }
      } catch (err) {
        if (mounted) {
          setHealth({ online: false, colmap_available: false });
        }
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="border-b border-[#2a2e39] bg-[#161920] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2 text-slate-100 font-semibold tracking-wide hover:text-blue-400 transition-colors">
            <Box className="w-5 h-5 text-blue-500" />
            <span className="font-mono text-base font-bold">Reconstruct3D</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60 font-mono">
              SfM · MVS
            </span>
          </Link>

          <nav className="flex items-center space-x-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isActive('/') ? 'bg-[#2a2e39] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/history"
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${
                isActive('/history') ? 'bg-[#2a2e39] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Project History</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Engine Status Indicators */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#0f1115] border border-[#2a2e39] text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>AI 3D Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="AI 3D Engine Ready" />
            </div>

            <div
              className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#0f1115] border border-[#2a2e39] text-slate-300"
              title={health.online ? 'FastAPI backend online' : 'FastAPI backend offline'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span>FastAPI</span>
            </div>
          </div>

          <Link
            to="/new"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium tracking-wide transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Project</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
