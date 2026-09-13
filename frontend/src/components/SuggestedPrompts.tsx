import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

const PRESETS: Record<string, string[]> = {
  dashboard: [
    'Daily pre-market briefing on my portfolio and NSE banking stocks',
    'Which sector is underrepresented in my portfolio vs NSE 20?',
  ],
  portfolio: [
    'Weekly drift report — is my allocation off target?',
    'Show me my riskiest holding and why',
  ],
  markets: [
    'Alert me when my watchlist moves >2% overnight',
    'Compare SCOM.NR vs KCB.NR vs SPY — which is better value?',
  ],
  screener: [
    'Brief me on today’s top NSE movers',
    'Screen for NSE dividends >4% with PE <12',
  ],
};

export default function SuggestedPrompts({ page }: { page: keyof typeof PRESETS }) {
  const { user } = useAuth();
  const prompts = PRESETS[page] ?? [];
  const create = async (prompt: string) => {
    if (!user) { toast({ title: 'Sign in to create briefings' }); return; }
    const { error } = await supabase.from('scheduled_briefings').insert({ user_id: user.id, prompt, schedule_cron: '0 6 * * 1-5', delivery: 'in_app' });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Briefing created ✓ — Settings → Briefings to edit' });
  };
  if (!prompts.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap gap-2 items-center">
      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Suggested prompts:</span>
      {prompts.map((p) => (
        <button key={p} onClick={() => create(p)} className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary border border-border hover:border-primary/30 text-left">{p}</button>
      ))}
    </div>
  );
}
