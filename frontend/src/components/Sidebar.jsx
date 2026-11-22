import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Settings,
  Info,
  Box,
  Layers,
  X
} from 'lucide-react';
import { getHealth } from '../api/client';

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const [health, setHealth] = useState({ online: true, colmap_available: true });

  useEffect(() => {
    let mounted = true;
    getHealth().then((res) => {
      if (mounted) {
        setHealth({
          online: true,
          colmap_available: res.data.colmap_available
        });
      }
    }).catch(() => {
      if (mounted) {
        setHealth({ online: false, colmap_available: false });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/history', label: 'Project History', icon: Clock },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/about', label: 'About', icon: Info },
  ];

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <NavLink
            to="/"
            onClick={() => isMobile && onClose()}
            className="flex items-center space-x-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 group-hover:border-zinc-700 transition-colors">
              <Box className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="font-semibold text-sm text-zinc-100 tracking-tight block">Reconstruct3D</span>
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider block">
                Photogrammetry Studio
              </span>
            </div>
          </NavLink>

          {isMobile && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => isMobile && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo Card & Status */}
      <div className="space-y-3 pt-3 border-t border-white/[0.06]">
        <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-center space-y-1.5">
          <div className="w-8 h-8 mx-auto rounded-md bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xs font-medium text-zinc-200">
            Turn 2D into 3D
          </div>
          <p className="text-[10px] text-zinc-500">
            AI 3D Reconstruction Studio
          </p>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>AI 3D Engine Active</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex w-60 bg-[#0d0d10] border-r border-white/[0.08] flex-col justify-between shrink-0 min-h-screen select-none z-30 p-4">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Drawer & Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-[#0d0d10] border-r border-white/[0.08] flex flex-col justify-between p-4 shadow-2xl z-10 min-h-screen select-none">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
