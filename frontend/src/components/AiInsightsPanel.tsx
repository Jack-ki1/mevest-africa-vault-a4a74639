import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolio } from '@/context/PortfolioContext';
import { Brain, TrendingUp, Shield, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Insights {
  healthScore: number;
  riskLevel: string;
  summary: string;
  recommendations: string[];
  warnings: string[];
  diversificationScore: number;
}

export default function AiInsightsPanel() {
  const { holdings } = usePortfolio();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async () => {
    setLoading(true);
    try {
      const portfolio = holdings.map(h => ({
        symbol: h.sym, name: h.name, shares: h.shares, costBasis: h.cost, currentPrice: h.price, type: h.type, sector: h.sector,
      }));

      const { data, error } = await supabase.functions.invoke('ai-insights', {
        body: { mode: 'insights', portfolio },
      });

      if (error) throw error;
      setInsights(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'AI Analysis Failed', description: msg || 'Could not analyze portfolio', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => score >= 70 ? 'text-primary' : score >= 40 ? 'text-amber' : 'text-destructive';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">AI Portfolio Insights</span>
          <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">BETA</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {!insights ? (
            <div className="text-center py-6">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">Get AI-powered analysis of your portfolio health, risk, and recommendations.</p>
              <button onClick={analyze} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5">
                {loading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Brain className="w-3 h-3" /> Analyze Portfolio</>}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                  <div className={`text-lg font-bold ${scoreColor(insights.healthScore)}`}>{insights.healthScore}</div>
                  <div className="text-[9px] text-muted-foreground font-medium">Health</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                  <div className={`text-sm font-bold ${insights.riskLevel === 'Low' ? 'text-primary' : insights.riskLevel === 'Medium' ? 'text-amber' : 'text-destructive'}`}>
                    {insights.riskLevel}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium">Risk</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2.5 text-center">
                  <div className={`text-lg font-bold ${scoreColor(insights.diversificationScore)}`}>{insights.diversificationScore}</div>
                  <div className="text-[9px] text-muted-foreground font-medium">Diversity</div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-muted-foreground leading-relaxed">{insights.summary}</p>

              {/* Recommendations */}
              {insights.recommendations?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Recommendations</span>
                  </div>
                  {insights.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {insights.warnings?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Warnings</span>
                  </div>
                  {insights.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <div className="w-1 h-1 rounded-full bg-amber mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Refresh */}
              <button onClick={analyze} disabled={loading} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh analysis
              </button>

              <p className="text-[8px] text-muted-foreground/50 italic">AI-generated insights. Not financial advice.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
