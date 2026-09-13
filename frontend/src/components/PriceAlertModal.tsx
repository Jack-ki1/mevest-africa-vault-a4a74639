import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

export default function PriceAlertModal({ open, onClose, symbol, price }: { open: boolean; onClose: () => void; symbol: string; price?: number }) {
  const { user } = useAuth();
  const [condition, setCondition] = useState('price_above');
  const [threshold, setThreshold] = useState('');
  const [webhook, setWebhook] = useState('');
  const [watchlist, setWatchlist] = useState(false);
  const [extra, setExtra] = useState<string>('');
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const save = async () => {
    if (!user) { toast({ title: 'Sign in required' }); return; }
    const val = parseFloat(threshold);
    if (!val || val <= 0) { toast({ title: 'Enter a valid threshold' }); return; }
    setLoading(true);
    const payload: Record<string, unknown> = { user_id: user.id, symbol: watchlist ? 'WATCHLIST' : symbol, condition, threshold: val };
    if (webhook) payload.webhook_url = webhook;
    if (extra) payload.extra_conditions = [{ type: extra, threshold: val }];
    if (watchlist) payload.watchlist_id = 'all';
    const { error } = await supabase.from('price_alerts').insert(payload as never);
    setLoading(false);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { toast({ title: `Alert set for ${watchlist ? 'watchlist' : symbol}${webhook ? ' + webhook' : ''}` }); onClose(); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-[360px] p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm">Alert — {symbol} {price ? `@ ${price.toFixed(2)}` : ''}</div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            <option value="price_above">Price above</option>
            <option value="price_below">Price below</option>
            <option value="pct_change_up">Daily % up &gt;</option>
            <option value="pct_change_down">Daily % down &lt;</option>
            <option value="rsi_above">RSI above</option>
            <option value="rsi_below">RSI below</option>
          </select>
          <input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" placeholder="Threshold value" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          <input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="Webhook URL (TradingView pattern, optional)" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
          <select value={extra} onChange={(e) => setExtra(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
            <option value="">No extra condition</option>
            <option value="rsi_below">+ RSI below (multi-condition)</option>
            <option value="rsi_above">+ RSI above (multi-condition)</option>
          </select>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={watchlist} onChange={(e) => setWatchlist(e.target.checked)} /> Apply to entire watchlist (one alert many symbols)</label>
          <button onClick={save} disabled={loading} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Create Alert'}</button>
          <p className="text-[10px] text-muted-foreground">Delivered via push + email/WhatsApp + webhook if set.</p>
        </div>
      </div>
    </div>
  );
}
