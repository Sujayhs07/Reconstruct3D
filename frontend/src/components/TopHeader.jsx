import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, User, Menu } from 'lucide-react';
import { getHealth } from '../api/client';

export default function TopHeader({ onToggleMobileMenu = () => {} }) {
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
    <header className="h-14 px-3 sm:px-6 flex items-center justify-between border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur sticky top-0 z-20 select-none">
      {/* Left Workspace / Page Indicator with Mobile Hamburger */}
      <div className="flex items-center space-x-2 sm:space-x-3 text-xs">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <span className="text-zinc-500 font-mono hidden xs:inline">Reconstruct3D</span>
          <span className="text-zinc-600 hidden xs:inline">/</span>
          <span className="text-zinc-200 font-medium tracking-tight truncate max-w-[140px] sm:max-w-none">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Status Pills (Desktop & Tablet) */}
        <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span>AI 3D Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span>FastAPI</span>
          <span className={`w-1.5 h-1.5 rounded-full ${health.online ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>

        {/* New Project Button */}
        <Link
          to="/new"
          className="btn-primary flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 text-xs tracking-tight"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline">New Project</span>
          <span className="xs:hidden">New</span>
        </Link>

        {/* Operator Profile Pill */}
        <div className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 select-none" title="Logged in as Local Operator">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono text-[11px] text-zinc-300 hidden sm:inline">Operator</span>
        </div>
      </div>
    </header>
  );
}
