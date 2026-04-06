import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;

const QUICK_ACTIONS = [
  '📊 Analyze my portfolio',
  '📈 What\'s trending today?',
  '💡 Investment recommendations',
  '🔍 Look up a stock for me',
];

export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi! I'm **MEVEST AI** — your agentic financial assistant. I can look up real-time stock quotes, search global markets, fetch news, and analyze your portfolio. Try asking me anything! 🚀" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { holdings } = usePortfolio();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;
    const userMsg: Msg = { role: 'user', content: msgText };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setLoading(true);

    let assistantSoFar = '';

    try {
      const portfolio = holdings.map(h => ({ symbol: h.sym, name: h.name, shares: h.shares, cost: h.cost, price: h.price, sector: h.sector }));

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
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
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { /* partial */ }
        }
      }

      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message || 'Something went wrong. Please try again.'}` }]);
    } finally {
      setLoading(false);
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
    <div className="fixed bottom-5 right-5 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
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
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
            {m.role === 'user' && <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
          </div>
        ))}
        {loading && !messages[messages.length - 1]?.content && (
          <div className="flex gap-2">
            <Bot className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="bg-secondary rounded-xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3 h-3 animate-pulse" /> Thinking...
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
            placeholder="Ask about stocks, markets, portfolio..."
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:border-primary" />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
