import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const HF_MODEL = 'ProsusAI/finbert';
const FALLBACK_POS = ['beat', 'upgrade', 'growth', 'rise', 'high', 'record', 'profit', 'surge', 'rally'];
const FALLBACK_NEG = ['miss', 'downgrade', 'fall', 'drop', 'loss', 'cut', 'decline', 'crash', 'warn'];

function fallbackSentiment(title: string): { label: 'positive'|'negative'|'neutral', score: number } {
  const t = title.toLowerCase();
  let score = 0;
  for (const w of FALLBACK_POS) if (t.includes(w)) score += 1;
  for (const w of FALLBACK_NEG) if (t.includes(w)) score -= 1;
  if (score > 0) return { label: 'positive', score: 0.82 };
  if (score < 0) return { label: 'negative', score: -0.81 };
  return { label: 'neutral', score: 0.05 };
}

async function hfSentiment(text: string): Promise<{ label: 'positive'|'negative'|'neutral', score: number } | null> {
  const key = Deno.env.get('HF_API_KEY');
  if (!key) return null;
  try {
    const r = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const arr = Array.isArray(j) ? j[0] : Array.isArray(j[0]) ? j[0] : null;
    if (!arr) return null;
    const top = arr.sort((a: {score:number}, b:{score:number}) => b.score - a.score)[0];
    const label = top.label.toLowerCase() as 'positive'|'negative'|'neutral';
    return { label, score: top.score * (label === 'negative' ? -1 : 1) };
  } catch { return null; }
}

Deno.serve(async (req) => {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) return new Response('Unauthorized', { status: 401 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows } = await supabase.from('news_cache').select('id,title,symbol').is('sentiment', null).limit(30);
  if (!rows || rows.length === 0) return new Response(JSON.stringify({ updated: 0 }), { headers: { 'Content-Type': 'application/json' } });
  let updated = 0;
  for (const r of rows) {
    const hf = await hfSentiment(r.title);
    const fb = fallbackSentiment(r.title);
    const final = hf || fb;
    await supabase.from('news_cache').update({ sentiment: final.label, sentiment_score: final.score }).eq('id', r.id);
    // upsert symbol_sentiment
    const { data: recent } = await supabase.from('news_cache').select('sentiment_score').eq('symbol', r.symbol).not('sentiment_score', 'is', null).order('published_at', { ascending: false }).limit(5);
    const avg = recent && recent.length ? recent.reduce((a:number, x:{sentiment_score:number})=>a+Number(x.sentiment_score),0)/recent.length : final.score;
    const label = avg > 0.2 ? 'positive' : avg < -0.2 ? 'negative' : 'neutral';
    await supabase.from('symbol_sentiment').upsert({ symbol: r.symbol, avg_score: avg, label, updated_at: new Date().toISOString() }, { onConflict: 'symbol' });
    updated++;
  }
  return new Response(JSON.stringify({ updated }), { headers: { 'Content-Type': 'application/json' } });
});
