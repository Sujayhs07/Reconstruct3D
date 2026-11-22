import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, User } from 'lucide-react';
import { getHealth } from '../api/client';

export default function TopHeader() {
  const location = useLocation();
  const [health, setHealth] = useState({ online: true, colmap_available: true });

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await getHealth();
        if (mounted) {
          setHealth({
            online: true,
            colmap_available: res.data.colmap_available
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

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/history') return 'Project History';
    if (path === '/new') return 'New Project';
    if (path === '/settings') return 'Settings';
    if (path === '/about') return 'About';
    if (path.includes('/projects/')) return 'Workspace';
    return 'Studio';
  };

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur sticky top-0 z-20 select-none">
      {/* Left Workspace / Page Indicator */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-zinc-500 font-mono">Reconstruct3D</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200 font-medium tracking-tight">{getPageTitle()}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Status Pills */}
        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span>COLMAP 4.2.1</span>
          <span className={`w-1.5 h-1.5 rounded-full ${health.colmap_available ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span>FastAPI</span>
          <span className={`w-1.5 h-1.5 rounded-full ${health.online ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>

        {/* New Project Button */}
        <Link
          to="/new"
          className="btn-primary flex items-center space-x-1.5 px-3 py-1.5 text-xs tracking-tight"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Project</span>
        </Link>

        {/* Operator Profile Pill (replacing standalone 'S' avatar) */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 select-none" title="Logged in as Local Operator">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono text-[11px] text-zinc-300">Operator</span>
        </div>
      </div>
    </header>
  );
}
