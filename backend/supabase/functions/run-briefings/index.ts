import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function cronMatches(cron: string, now: Date): boolean {
  // Minimal: check if cron minute/hour matches current UTC (for demo). Full cron parsing would use a library.
  // Supports '0 6 * * 1-5' etc — for now just run all active briefings on each invocation
  return true;
}

function getAiConfig() {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gemini}` }, model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash' };
  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) return { url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` }, model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini' };
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (lovable) return { url: 'https://ai.gateway.lovable.dev/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovable}` }, model: 'google/gemini-3-flash-preview' };
  return null;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: briefings } = await supabase.from('scheduled_briefings').select('*').eq('active', true);
  if (!briefings || briefings.length === 0) {
    return new Response(JSON.stringify({ ran: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }
  const aiConfig = getAiConfig();
  let ran = 0;
  for (const b of briefings) {
    if (!cronMatches(b.schedule_cron, new Date())) continue;
    // Fetch portfolio/watchlist for user
    const { data: holdings } = await supabase.from('holdings').select('symbol,name,shares,cost_basis').eq('user_id', b.user_id).limit(20);
    const holdingsText = holdings && holdings.length ? `Holdings: ${holdings.map((h: any) => `${h.symbol} ${h.shares}@${h.cost_basis}`).join(', ')}` : 'No holdings';
    let content = `Briefing for: ${b.prompt}\n${holdingsText}\nGenerated at ${new Date().toISOString()}`;
    if (aiConfig) {
      try {
        const res = await fetch(aiConfig.url, {
          method: 'POST',
          headers: aiConfig.headers,
          body: JSON.stringify({ model: aiConfig.model, messages: [{ role: 'system', content: `You are MEVEST AI. Deliver a concise briefing answering: ${b.prompt}. Cite sources where possible.` }, { role: 'user', content: holdingsText }], temperature: 0.3, max_tokens: 400 }),
        });
        if (res.ok) {
          const data = await res.json();
          content = data.choices?.[0]?.message?.content || content;
        }
      } catch { /* use fallback */ }
    }
    await supabase.from('briefing_results').insert({ briefing_id: b.id, user_id: b.user_id, content, sources: [] });
    await supabase.from('scheduled_briefings').update({ last_run_at: new Date().toISOString() }).eq('id', b.id);
    // WhatsApp delivery stub — requires WHATSAPP_TOKEN + phone mapping
    if (b.delivery === 'whatsapp' && Deno.env.get('WHATSAPP_TOKEN')) {
      console.log(`[run-briefings] WhatsApp delivery for ${b.id} — implement provider send here`);
    }
    ran++;
  }
  return new Response(JSON.stringify({ ran }), { headers: { 'Content-Type': 'application/json' } });
});
