import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, PlusCircle, Settings } from 'lucide-react';

export default function MobileBottomNav() {
  const items = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/new', label: 'New', icon: PlusCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0d0d10]/95 backdrop-blur-md border-t border-white/[0.08] px-2 py-1.5 flex items-center justify-around select-none">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
