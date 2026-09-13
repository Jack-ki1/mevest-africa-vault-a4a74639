import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const MODULES = [
  { id: 'book_closure', title: 'What is a dividend book-closure date?', body: 'NSE companies close their register on book-closure date. Buy before ex-date to receive the dividend. Mali tracks this obsessively — now you can too via Calendar → Dividends.', quiz: [{ q: 'Do you need to hold on ex-date to get the dividend?', a: ['Yes','No'], correct: 1 }] },
  { id: 'tbill_vs_mmf', title: 'T-Bill vs MMF vs Stocks', body: '91-day T-Bill is risk-free (CBK). MMFs (~13%) beat savings but trail stocks long-term. Use RatesComparator to see where your portfolio sits.', quiz: [{ q: 'Which is risk-free?', a: ['Stocks','T-Bill','MMF'], correct: 1 }] },
  { id: 'pe_ratio', title: 'Reading a P/E ratio', body: 'P/E = price / earnings per share. Lower isn’t always cheaper — growth stocks justify higher P/E. Screen by P/E in Screener → Advanced.', quiz: [{ q: 'High P/E can mean?', a: ['Always overvalued','High growth expectations','Low earnings forever'], correct: 1 }] },
  { id: 'diversification', title: 'Diversification', body: 'One banking stock isn’t a portfolio. Spread across sectors and KES vs USD assets. Check Analytics → Beta.', quiz: [{ q: 'Diversification reduces?', a: ['All risk','Unsystematic risk','Returns'], correct: 1 }] },
];

export default function LearnPage() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from('learning_progress').select('module_id,completed').eq('user_id', user.id).eq('completed', true).then(({ data }) => {
      if (data) setCompleted(new Set(data.map((r: { module_id: string }) => r.module_id)));
    });
  }, [user?.id]);
  const answer = async (moduleId: string, correct: boolean) => {
    if (!correct) { toast({ title: 'Try again' }); return; }
    if (!user) { toast({ title: 'Sign in to track progress' }); return; }
    await supabase.from('learning_progress').upsert({ user_id: user.id, module_id: moduleId, completed: true, completed_at: new Date().toISOString(), score: 100 }, { onConflict: 'user_id,module_id' });
    setCompleted(prev => new Set([...prev, moduleId]));
    toast({ title: 'Module completed ✓ Badge earned' });
  };
  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold">Learn — Financial Literacy</div>
      <div className="text-xs text-muted-foreground">3-5 minute modules. Complete the quiz to earn a badge. Two modules link directly to RatesComparator and Screener.</div>
      <div className="grid gap-3">
        {MODULES.map(m => (
          <div key={m.id} className={`bg-card border rounded-xl p-4 ${completed.has(m.id) ? 'border-primary/30' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{m.title} {completed.has(m.id) && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">✓ Completed</span>}</div>
              <button onClick={() => setOpen(open === m.id ? null : m.id)} className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border">{open === m.id ? 'Hide' : 'Open'}</button>
            </div>
            {open === m.id && (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">{m.body}</p>
                {m.quiz.map((q, idx) => (
                  <div key={idx} className="bg-secondary rounded-lg p-3">
                    <div className="text-xs font-semibold mb-2">{q.q}</div>
                    <div className="flex gap-2">
                      {q.a.map((opt, oi) => (
                        <button key={oi} onClick={() => answer(m.id, oi === q.correct)} className="px-2 py-1 rounded-lg text-xs bg-card border border-border hover:border-primary/30">{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
