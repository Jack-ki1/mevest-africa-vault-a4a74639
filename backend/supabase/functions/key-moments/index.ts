import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function getAiConfig() {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gemini}` }, model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash' };
  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) return { url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` }, model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini' };
  const openrouter = Deno.env.get('OPENROUTER_API_KEY');
  if (openrouter) return { url: 'https://openrouter.ai/api/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouter}` }, model: Deno.env.get('OPENROUTER_MODEL') || 'google/gemini-flash-1.5' };
  return null;
}

async function generateKeyMoment(symbol: string, changePct: number, headlines: { title: string; url: string }[]) {
  const aiConfig = getAiConfig();
  if (!aiConfig) {
    // Fallback without AI
    return `${symbol} moved ${changePct.toFixed(1)}% today. ${headlines.length ? `Headlines: ${headlines.map(h=>h.title).join('; ')}` : 'No recent headlines explain the move.'}`;
  }
  const prompt = `${symbol} moved ${changePct.toFixed(1)}% today. Recent headlines:\n` +
    headlines.map((h, i) => `[${i + 1}] ${h.title}`).join('\n') +
    `\n\nIn 2-3 sentences, explain the most likely driver, citing headline numbers like [1]. If the headlines don't clearly explain the move, say so explicitly — do not invent a reason.`;

  try {
    const res = await fetch(aiConfig.url, {
      method: 'POST',
      headers: aiConfig.headers,
      body: JSON.stringify({ model: aiConfig.model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 200 }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return data.choices?.[0]?.message?.content || `${symbol} moved ${changePct.toFixed(1)}% — no AI summary available.`;
  } catch {
    return `${symbol} moved ${changePct.toFixed(1)}% today. ${headlines.length ? 'See headlines for context.' : 'No headlines available.'}`;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { symbol, changePct } = await req.json();
  if (!symbol || typeof changePct !== 'number') return new Response('Bad request', { status: 400 });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: news } = await supabase.from('news_cache').select('title,url').eq('symbol', symbol).order('published_at', { ascending: false }).limit(5);
  const headlines = (news ?? []).map(n => ({ title: n.title, url: n.url }));
  const summary = await generateKeyMoment(symbol, changePct, headlines);
  const sources = headlines;
  await supabase.from('key_moments').insert({ symbol, change_pct: changePct, summary, sources });
  return new Response(JSON.stringify({ symbol, changePct, summary, sources }), { headers: { 'Content-Type': 'application/json' } });
});
