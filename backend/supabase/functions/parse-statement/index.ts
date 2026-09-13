import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXTRACTION_PROMPT = `Extract every holding from this brokerage statement image/PDF.
Return ONLY a JSON array: [{"symbol": string, "shares": number, "cost_basis": number, "currency": string}].
If a field is unreadable, use null for that field — never guess a number that isn't visible.
Do not include cash balances, only tradable positions.`;

function getAiConfig() {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gemini}` }, model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash' };
  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) return { url: 'https://api.openai.com/v1/chat/completions', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` }, model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini' };
  return null;
}

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch { return null; }
}

Deno.serve(async (req) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const userId = await getUserId(req.headers.get('Authorization'));
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return new Response(JSON.stringify({ error: 'Missing imageBase64' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const aiConfig = getAiConfig();
    if (!aiConfig) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const res = await fetch(aiConfig.url, {
      method: 'POST',
      headers: aiConfig.headers,
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'user', content: [{ type: 'text', text: EXTRACTION_PROMPT }, { type: 'image_url', image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBase64}` } }] },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `AI error ${res.status}`, detail: txt.slice(0, 500) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    let holdings: unknown = [];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      holdings = match ? JSON.parse(match[0]) : [];
    } catch { holdings = []; }
    return new Response(JSON.stringify({ holdings, raw: content.slice(0, 1000) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
