import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Trash2, Wrench } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;

const QUICK_ACTIONS = [
  '📊 Analyze my portfolio',
  '📈 What\'s trending today?',
  '💡 Investment recommendations',
  '🔍 Look up a stock for me',
  '➕ Add AAPL to my portfolio (10 shares at $190)',
  '⚡ Compare AAPL vs MSFT vs GOOGL',
];

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm **MEVEST AI** — your agentic financial assistant. I can look up real-time quotes, search global markets, fetch news, **add/remove holdings**, **manage your watchlist**, compare stocks, and analyze your portfolio. Try asking me anything! 🚀" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { holdings } = usePortfolio();
  const { session } = useAuth();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, toolStatus]);

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: "Chat cleared! How can I help you? 🚀" },
    ]);
    setToolStatus(null);
  };

  const send = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;
    const userMsg: Msg = { role: 'user', content: msgText };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setLoading(true);
    setToolStatus(null);

    let assistantSoFar = '';

    try {
      const portfolio = holdings.map(h => ({ symbol: h.sym, name: h.name, shares: h.shares, cost: h.cost, price: h.price, sector: h.sector }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      // Pass user's auth token for agentic DB operations
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'chat',
          portfolio: portfolio.length > 0 ? portfolio : undefined,
          messages: allMsgs.filter(m => m.role !== 'assistant' || m !== messages[0]).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(resp.status === 429 ? 'Rate limited — try again shortly.' : resp.status === 402 ? 'AI credits exhausted.' : 'AI unavailable');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > allMsgs.length) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const p = JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> };
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch (err) { console.warn('[AI] chunk parse failed', err); }
        }
      }

      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const c = (JSON.parse(json) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch (err) { console.warn('[AI] buffer parse failed', err); }
        }
      }

      // Check if any portfolio/watchlist changes happened — trigger reload
      if (assistantSoFar.includes('Added') || assistantSoFar.includes('Removed') || assistantSoFar.includes('portfolio') || assistantSoFar.includes('watchlist')) {
        // Dispatch a custom event to trigger context refreshes
        window.dispatchEvent(new CustomEvent('mevest-data-changed'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg || 'Something went wrong. Please try again.'}` }]);
    } finally {
      setLoading(false);
      setToolStatus(null);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform">
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[400px] h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground">MEVEST AI</span>
            <span className="ml-2 text-[8px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">AGENTIC</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="text-muted-foreground hover:text-foreground p-1" title="Clear chat">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Bot className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-xs prose-invert max-w-none [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0 [&_table]:text-[10px] [&_strong]:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
                  <ReactMarkdown>{m.content.replace(/\[(\d+)\]/g, ' <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold">[$1]</span> ')}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
            {m.role === 'user' && <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <Bot className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="bg-secondary rounded-xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              {toolStatus ? (
                <><Wrench className="w-3 h-3 animate-pulse text-primary" /> {toolStatus}</>
              ) : (
                <><Sparkles className="w-3 h-3 animate-pulse" /> Thinking...</>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && !loading && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map(a => (
            <button key={a} onClick={() => send(a)} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about stocks, add holdings, manage watchlist..."
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary" />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[9px] text-muted-foreground text-center mt-1.5">MEVEST AI cites its sources. Verify anything you plan to act on.</div>
      </div>
    </div>
  );
}
