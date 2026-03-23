import { useState, useMemo } from 'react';
import { SECTOR_HEATMAP, SECTOR_PERFORMANCE, formatPct } from '@/data/market-data';

const VIEWS = ['treemap', 'sectors'] as const;

export default function HeatmapPage() {
  const [view, setView] = useState<typeof VIEWS[number]>('treemap');
  const [tfKey, setTfKey] = useState<'chg1d' | 'chg1w' | 'chg1m' | 'chgYtd'>('chg1d');

  const sectors = useMemo(() => {
    const groups: Record<string, typeof SECTOR_HEATMAP> = {};
    SECTOR_HEATMAP.forEach(item => {
      if (!groups[item.sector]) groups[item.sector] = [];
      groups[item.sector].push(item);
    });
    return groups;
  }, []);

  const totalMktcap = SECTOR_HEATMAP.reduce((s, i) => s + i.mktcap, 0);

  const getColor = (pct: number) => {
    if (pct > 3) return 'bg-primary/80 text-primary-foreground';
    if (pct > 1) return 'bg-primary/50 text-primary-foreground';
    if (pct > 0) return 'bg-primary/25 text-foreground';
    if (pct > -1) return 'bg-destructive/20 text-foreground';
    if (pct > -3) return 'bg-destructive/40 text-destructive-foreground';
    return 'bg-destructive/70 text-destructive-foreground';
  };

  const getBgStyle = (pct: number) => {
    if (pct > 3) return { background: 'hsl(157 52% 40% / 0.85)' };
    if (pct > 1) return { background: 'hsl(157 52% 40% / 0.55)' };
    if (pct > 0) return { background: 'hsl(157 52% 40% / 0.25)' };
    if (pct > -1) return { background: 'hsl(0 72% 50% / 0.25)' };
    if (pct > -3) return { background: 'hsl(0 72% 50% / 0.50)' };
    return { background: 'hsl(0 72% 50% / 0.75)' };
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">Market Heatmap</div>
          <div className="text-xs text-muted-foreground mt-0.5">Visual overview of market performance by size</div>
        </div>
        <div className="flex gap-2">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs border capitalize ${view === v ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
              {v === 'treemap' ? '🗺️ Treemap' : '📊 Sectors'}
            </button>
          ))}
        </div>
      </div>

      {view === 'treemap' ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Market Cap Weighted Heatmap</span>
            <div className="ml-auto flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(157 52% 40% / 0.85)' }} /> {'>'} +3%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(157 52% 40% / 0.35)' }} /> +0-3%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(0 72% 50% / 0.35)' }} /> 0 to -3%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(0 72% 50% / 0.75)' }} /> {'<'} -3%</span>
            </div>
          </div>
          <div className="p-3.5">
            <div className="space-y-1.5">
              {Object.entries(sectors).map(([sector, items]) => {
                const sectorMktcap = items.reduce((s, i) => s + i.mktcap, 0);
                const sectorPct = (sectorMktcap / totalMktcap * 100);
                if (sectorPct < 1) return null;
                return (
                  <div key={sector}>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1">{sector}</div>
                    <div className="flex gap-1" style={{ height: Math.max(60, sectorPct * 2.5) }}>
                      {items
                        .sort((a, b) => b.mktcap - a.mktcap)
                        .map(item => {
                          const widthPct = (item.mktcap / sectorMktcap * 100);
                          return (
                            <div
                              key={item.sym}
                              className="rounded-lg flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                              style={{ ...getBgStyle(item.chgPct), width: widthPct + '%', minWidth: 50 }}
                            >
                              <div className="font-mono text-[13px] font-bold">{item.sym}</div>
                              <div className={`font-mono text-[11px] font-semibold ${item.chgPct >= 0 ? '' : ''}`}>
                                {item.chgPct >= 0 ? '+' : ''}{item.chgPct.toFixed(2)}%
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Timeframe selector */}
          <div className="flex gap-1.5">
            {([['chg1d', '1D'], ['chg1w', '1W'], ['chg1m', '1M'], ['chgYtd', 'YTD']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTfKey(k)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono ${tfKey === k ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border">
              <span className="font-display text-[13px] font-bold">Sector Performance</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Sector', '1D', '1W', '1M', '3M', 'YTD'].map(h => (
                      <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${h !== 'Sector' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SECTOR_PERFORMANCE.sort((a, b) => b[tfKey] - a[tfKey]).map(s => (
                    <tr key={s.name} className="border-b border-border/50 hover:bg-glass">
                      <td className="p-[10px] px-[11px] font-semibold">{s.name}</td>
                      {(['chg1d', 'chg1w', 'chg1m', 'chg3m', 'chgYtd'] as const).map(k => (
                        <td key={k} className="text-right p-[10px] px-[11px]">
                          <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${s[k] >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
                            {formatPct(s[k])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sector bars visual */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border">
              <span className="font-display text-[13px] font-bold">Sector Returns Visualization</span>
            </div>
            <div className="p-3.5 space-y-2">
              {SECTOR_PERFORMANCE.sort((a, b) => b[tfKey] - a[tfKey]).map(s => {
                const val = s[tfKey];
                const maxAbs = Math.max(...SECTOR_PERFORMANCE.map(x => Math.abs(x[tfKey])));
                const barWidth = Math.abs(val) / maxAbs * 100;
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[11px] w-[90px] text-right text-muted-foreground">{s.name}</span>
                    <div className="flex-1 h-[18px] relative flex items-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full h-px bg-border" />
                      </div>
                      {val >= 0 ? (
                        <div className="h-[14px] rounded-r-sm bg-primary/60" style={{ width: barWidth * 0.5 + '%' }} />
                      ) : (
                        <div className="ml-auto h-[14px] rounded-l-sm bg-destructive/60" style={{ width: barWidth * 0.5 + '%' }} />
                      )}
                    </div>
                    <span className={`font-mono text-[10px] w-[50px] text-right ${val >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatPct(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
