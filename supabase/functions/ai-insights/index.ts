const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, portfolio, messages, question } = await req.json();

    let systemPrompt: string;
    let userContent: string;

    if (mode === 'chat') {
      systemPrompt = `You are MEVEST AI, an expert financial advisor assistant embedded in the MEVEST wealth management platform. You help investors analyze their portfolio, understand market trends, and make informed decisions. Be concise, data-driven, and actionable. Format responses with markdown. If the user's portfolio data is provided, reference specific holdings. Always include a brief disclaimer that this is not financial advice.`;
      
      // For chat mode, return messages array for conversation
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(portfolio ? [{ role: 'system', content: `User's current portfolio: ${JSON.stringify(portfolio)}` }] : []),
        ...(messages || [{ role: 'user', content: question || 'Hello' }]),
      ];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: chatMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${status}`);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Insights mode
    systemPrompt = `You are MEVEST AI, analyzing an investor's portfolio. Provide a JSON response with: 
    {"healthScore": 0-100, "riskLevel": "Low"|"Medium"|"High", "summary": "brief overall assessment", "recommendations": ["action1","action2","action3"], "warnings": ["warning1"], "diversificationScore": 0-100}
    Be specific about the holdings provided. Consider sector concentration, geographic exposure, and risk factors.`;

    userContent = portfolio
      ? `Analyze this portfolio: ${JSON.stringify(portfolio)}`
      : 'The user has no holdings yet. Provide general investment advice for a new investor in Kenya.';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from the response
    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      insights = { summary: content, healthScore: 50, riskLevel: 'Medium', recommendations: [], warnings: [], diversificationScore: 50 };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
