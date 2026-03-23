import { useState } from 'react';
import {
  LayoutDashboard, Box, Activity, TrendingUp, List, Eye, FileText, Settings,
  Grid3X3, Calendar, Star, BarChart3,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'My Portfolio',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'portfolio', label: 'My Portfolio', icon: Box },
      { id: 'analytics', label: 'Analytics', icon: Activity },
    ],
  },
  {
    label: 'Markets',
    items: [
      { id: 'charts', label: 'Charts', icon: TrendingUp },
      { id: 'screener', label: 'Screener', icon: List },
      { id: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
      { id: 'marketwatch', label: 'Market Watch', icon: BarChart3 },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'news', label: 'News Feed', icon: FileText, hasNotif: true },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'watchlist', label: 'Watchlist', icon: Star },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[220px] bg-secondary border-r border-border flex flex-col flex-shrink-0 max-md:w-[58px]">
      {/* Logo */}
      <div className="px-[18px] py-[18px] pb-[14px] border-b border-border flex items-center gap-[10px]">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-400 rounded-lg flex items-center justify-center font-display font-extrabold text-base text-white flex-shrink-0">
          M
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-foreground max-md:hidden">
          Me<span className="text-primary">vest</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-[10px] px-2 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-[18px]">
            <div className="text-[10px] font-semibold text-muted-foreground tracking-[1.2px] uppercase px-[10px] mb-[5px] max-md:hidden">
              {section.label}
            </div>
            {section.items.map(item => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-[10px] px-[10px] py-2 rounded-lg text-[13px] mb-[2px] border border-transparent transition-all ${
                    active
                      ? 'bg-accent-dim text-primary border-primary/30'
                      : 'text-muted-foreground hover:bg-glass hover:text-foreground'
                  }`}
                >
                  <Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.8} />
                  <span className="max-md:hidden">{item.label}</span>
                  {item.hasNotif && (
                    <div className="w-1.5 h-1.5 bg-destructive rounded-full ml-auto flex-shrink-0 max-md:hidden" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-[10px] border-t border-border">
        <div className="flex items-center gap-[9px] px-[10px] py-2 rounded-lg bg-glass border border-border">
          <div className="w-[30px] h-[30px] bg-gradient-to-br from-primary to-emerald-400 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            AK
          </div>
          <div className="max-md:hidden">
            <div className="text-xs font-semibold text-foreground">Alex Kamau</div>
            <div className="text-[10px] text-primary">Pro Account</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
