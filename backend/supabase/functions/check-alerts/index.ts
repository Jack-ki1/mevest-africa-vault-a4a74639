import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { symbol, price } = await req.json();
  if (!symbol || typeof price !== 'number') return new Response('Bad request', { status: 400 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Check normal alerts + watchlist alerts (symbol='WATCHLIST' or watchlist_id)
  const { data: alertsDirect } = await supabase.from('price_alerts').select('*').eq('symbol', symbol).eq('active', true);
  const { data: alertsWatch } = await supabase.from('price_alerts').select('*').eq('symbol', 'WATCHLIST').eq('active', true);
  const alerts = [...(alertsDirect ?? []), ...(alertsWatch ?? [])];
  // Also check alerts with watchlist_id set
  const { data: alertsWlId } = await supabase.from('price_alerts').select('*').not('watchlist_id', 'is', null).eq('active', true);
  for (const wA of alertsWlId ?? []) {
    if (!alerts.find((a) => a.id === wA.id)) {
      // evaluate against all watchlist symbols — if this symbol is watched by owner
      const { data: wl } = await supabase.from('watchlist_items').select('symbol').eq('user_id', wA.user_id);
      if (wl?.some((x: {symbol:string}) => x.symbol === symbol)) alerts.push(wA);
    }
  }
  if (!alerts || alerts.length === 0) return new Response(JSON.stringify({ checked: 0 }), { headers: { 'Content-Type': 'application/json' } });
  let triggered = 0;
  for (const a of alerts) {
    let hit = false;
    if (a.condition === 'price_above' && price >= Number(a.threshold)) hit = true;
    if (a.condition === 'price_below' && price <= Number(a.threshold)) hit = true;
    if (a.condition === 'pct_change_up' && price >= Number(a.threshold)) hit = true;
    if (a.condition === 'pct_change_down' && price <= Number(a.threshold)) hit = true;
    // extra_conditions multi-condition AND
    const extra = (a.extra_conditions as unknown as Array<{type:string;threshold:number}> | null) ?? [];
    if (hit && extra.length) {
      // For now mock: require price also satisfy extra (real RSI would need indicator calc)
      for (const e of extra) {
        if (e.type === 'rsi_below' && price > Number(e.threshold)) hit = false;
        if (e.type === 'rsi_above' && price < Number(e.threshold)) hit = false;
      }
    }
    if (hit) {
      await supabase.from('price_alerts').update({ active: false, triggered_at: new Date().toISOString() }).eq('id', a.id);
      triggered++;
      if (a.webhook_url) {
        try {
          await fetch(a.webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol, price, condition: a.condition, threshold: a.threshold, ts: new Date().toISOString() }) });
        } catch (err) { console.warn('[check-alerts] webhook failed', err); }
      }
      console.log(`[check-alerts] Alert ${a.id} for ${symbol} triggered at ${price}`);
    }
  }
  return new Response(JSON.stringify({ checked: alerts.length, triggered }), { headers: { 'Content-Type': 'application/json' } });
});
