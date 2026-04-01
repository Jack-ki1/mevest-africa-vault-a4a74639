import {
  LayoutDashboard, Box, Activity, TrendingUp, List, Eye, FileText, Settings,
  Grid3X3, Calendar, Star, BarChart3, Globe,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Portfolio',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'portfolio', label: 'My Portfolio', icon: Box },
      { id: 'analytics', label: 'Analytics', icon: Activity },
    ],
  },
  {
    label: 'Markets',
    items: [
      { id: 'markets', label: 'Markets', icon: TrendingUp },
      { id: 'screener', label: 'Screener', icon: List },
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
    <aside className="w-[210px] bg-sidebar border-r border-border flex flex-col flex-shrink-0 max-md:w-[56px]">
      {/* Logo */}
      <div className="px-[16px] py-[16px] pb-[13px] border-b border-border flex items-center gap-[9px]">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-400 rounded-lg flex items-center justify-center font-display font-extrabold text-base text-white flex-shrink-0 shadow-sm shadow-primary/30">
          M
        </div>
        <div className="max-md:hidden">
          <span className="font-display font-bold text-[17px] tracking-tight text-foreground">
            Me<span className="text-primary">vest</span>
          </span>
          <div className="text-[8px] font-semibold text-muted-foreground tracking-[1.5px] uppercase -mt-0.5">WEALTH PLATFORM</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-[8px] px-2 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-[16px]">
            <div className="text-[9px] font-bold text-muted-foreground/70 tracking-[1.4px] uppercase px-[10px] mb-[4px] max-md:hidden">
              {section.label}
            </div>
            {section.items.map(item => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-[9px] px-[10px] py-[7px] rounded-lg text-[12.5px] mb-[1px] border border-transparent transition-all duration-150 ${
                    active
                      ? 'bg-primary/12 text-primary border-primary/20 font-semibold'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-[14px] h-[14px] flex-shrink-0 ${active ? 'text-primary' : ''}`} strokeWidth={active ? 2.2 : 1.7} />
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
      <div className="p-[8px] border-t border-border">
        <div className="flex items-center gap-[8px] px-[10px] py-[8px] rounded-lg bg-muted/30 border border-border/50">
          <div className="w-[28px] h-[28px] bg-gradient-to-br from-primary to-emerald-400 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm shadow-primary/20">
            AK
          </div>
          <div className="max-md:hidden">
            <div className="text-[11px] font-semibold text-foreground">Alex Kamau</div>
            <div className="text-[9px] text-primary font-semibold">Pro Account</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
