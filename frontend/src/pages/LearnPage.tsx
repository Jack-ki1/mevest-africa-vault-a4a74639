import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Calculator, Award, Flame, GraduationCap, Trophy, TrendingUp, Home, PiggyBank, X } from 'lucide-react';

const MODULES = [
  { id: 'book_closure', title: 'What is a dividend book-closure date?', body: 'NSE companies close their register on book-closure date. Buy before ex-date to receive the dividend. Mali tracks this obsessively — now you can too via Calendar → Dividends.', quiz: [{ q: 'Do you need to hold on ex-date to get the dividend?', a: ['Yes','No'], correct: 1 }] },
  { id: 'tbill_vs_mmf', title: 'T-Bill vs MMF vs Stocks', body: '91-day T-Bill is risk-free (CBK). MMFs (~13%) beat savings but trail stocks long-term. Use RatesComparator to see where your portfolio sits.', quiz: [{ q: 'Which is risk-free?', a: ['Stocks','T-Bill','MMF'], correct: 1 }] },
  { id: 'pe_ratio', title: 'Reading a P/E ratio', body: 'P/E = price / earnings per share. Lower isn’t always cheaper — growth stocks justify higher P/E. Screen by P/E in Screener → Advanced.', quiz: [{ q: 'High P/E can mean?', a: ['Always overvalued','High growth expectations','Low earnings forever'], correct: 1 }] },
  { id: 'diversification', title: 'Diversification', body: 'One banking stock isn’t a portfolio. Spread across sectors and KES vs USD assets. Check Analytics → Beta.', quiz: [{ q: 'Diversification reduces?', a: ['All risk','Unsystematic risk','Returns'], correct: 1 }] },
];

function GlassCard({children,className=''}:{children:React.ReactNode;className?:string}){ return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_4px_24px_hsl(var(--foreground)/0.04)] ${className}`}>{children}</motion.div>; }

export default function LearnPage() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [showCert, setShowCert]=useState(false);
  const [streak, setStreak]=useState(()=>{ const v=localStorage.getItem('mev_streak'); return v? Number(v):3; });
  const [xp, setXp]=useState(()=> completed.size*25);

  // calculators
  const [ci, setCi]=useState({principal:100000, rate:12, years:10});
  const [ret, setRet]=useState({currentAge:30, retireAge:60, monthly:20000, rate:10});
  const [mort, setMort]=useState({principal:5000000, rate:12, years:20});
  const [calcTab, setCalcTab]=useState<'compound'|'retire'|'mortgage'>('compound');

  useEffect(() => {
    if (!user) return;
    supabase.from('learning_progress').select('module_id,completed').eq('user_id', user.id).eq('completed', true).then(({ data }) => { if (data) setCompleted(new Set(data.map((r: { module_id: string }) => r.module_id))); });
  }, [user?.id]);

  useEffect(()=>{ setXp(completed.size*25); if(completed.size===4) { const k='mev_cert_shown'; if(!sessionStorage.getItem(k)){ setTimeout(()=>setShowCert(true),600); sessionStorage.setItem(k,'1'); } } },[completed]);

  useEffect(()=>{ // streak mock increment daily
    const last=localStorage.getItem('mev_streak_last');
    const today=new Date().toDateString();
    if(last!==today){ const n=last? streak+1 : streak; setStreak(n); localStorage.setItem('mev_streak',String(n)); localStorage.setItem('mev_streak_last',today); }
  },[]);

  const answer = async (moduleId: string, correct: boolean) => {
    if (!correct) { toast({ title: 'Try again' }); return; }
    if (!user) { toast({ title: 'Sign in to track progress' }); return; }
    await supabase.from('learning_progress').upsert({ user_id: user.id, module_id: moduleId, completed: true, completed_at: new Date().toISOString(), score: 100 }, { onConflict: 'user_id,module_id' });
    setCompleted(prev => new Set([...prev, moduleId]));
    setStreak(s=>{ const n=s+1; localStorage.setItem('mev_streak',String(n)); return n; });
    toast({ title: 'Module completed ✓ Badge earned +25 XP' });
  };

  const ciResult=useMemo(()=>{
    const r=ci.rate/100; const fv=ci.principal*Math.pow(1+r, ci.years);
    const data=Array.from({length:ci.years+1},(_,i)=>({year:i, value: Math.round(ci.principal*Math.pow(1+r,i))}));
    return {fv, data, interest: fv-ci.principal};
  },[ci]);
  const retResult=useMemo(()=>{
    const months=(ret.retireAge-ret.currentAge)*12; const mr=ret.rate/100/12;
    const fv = ret.monthly * ((Math.pow(1+mr, months)-1)/mr);
    const data=Array.from({length: Math.ceil(months/12)},(_,i)=>{ const m=(i+1)*12; return {year: ret.currentAge+i+1, value: Math.round(ret.monthly*((Math.pow(1+mr,m)-1)/mr))};});
    return {fv, months, data};
  },[ret]);
  const mortResult=useMemo(()=>{
    const mr=mort.rate/100/12; const n=mort.years*12; const p=mort.principal;
    const monthly = mr===0? p/n : p*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1);
    const total=monthly*n; const interest=total-p;
    return {monthly, total, interest};
  },[mort]);

  const pct = Math.round((completed.size/ MODULES.length)*100);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-display text-[19px] font-extrabold">Learn — Financial Literacy</div>
          <div className="text-xs text-muted-foreground">3-5 minute modules. Complete the quiz to earn a badge. Two modules link directly to RatesComparator and Screener.</div>
        </div>
        <button onClick={()=>setShowCert(true)} disabled={completed.size<4} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${completed.size===4?'bg-amber-500 text-white border-amber-600 shadow':'bg-secondary border-border text-muted-foreground opacity-60'}`}><Award className="w-4 h-4"/>{completed.size===4?'View Certificate':'Certificate locked'}</button>
      </div>

      {/* Gamification bar */}
      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-8 p-3.5">
          <div className="flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-primary"/><span className="font-display text-[13px] font-bold">Your Progress</span><span className="ml-auto text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">{completed.size}/{MODULES.length} modules</span></div>
          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6}} className="h-full bg-primary rounded-full" /></div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>{pct}% complete</span><span>{completed.size*25} XP earned</span></div>
          <div className="mt-3 flex items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full text-[11px] font-semibold"><Trophy className="w-3 h-3"/> Level {Math.floor(completed.size/2)+1}</span><span className="text-muted-foreground">Next level at {((Math.floor(completed.size/2)+1)*50)} XP</span></div>
        </GlassCard>
        <GlassCard className="col-span-12 lg:col-span-4 p-3.5 flex flex-col justify-center">
          <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500"/><span className="font-display text-[13px] font-bold">Streak</span></div>
          <div className="flex items-baseline gap-2 mt-1"><span className="font-mono text-3xl font-bold">{streak}</span><span className="text-xs text-muted-foreground">days</span><span className="ml-auto text-[10px] bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">🔥 Keep it up!</span></div>
          <div className="flex gap-1 mt-2">{Array.from({length:7}).map((_,i)=>(<div key={i} className={`flex-1 h-1.5 rounded-full ${i< Math.min(streak,7) ? 'bg-orange-500':'bg-muted/30'}`} />))}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Daily streak — open Learn each day.</div>
        </GlassCard>
      </div>

      <div className="grid gap-3">
        {MODULES.map(m => (
          <GlassCard key={m.id} className={`p-4 ${completed.has(m.id) ? 'border-primary/30' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-2">{m.title} {completed.has(m.id) && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Award className="w-3 h-3"/>Completed +25 XP</span>}</div>
              <button onClick={() => setOpen(open === m.id ? null : m.id)} className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border">{open === m.id ? 'Hide' : 'Open'}</button>
            </div>
            <AnimatePresence>
            {open === m.id && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">{m.body}</p>
                {m.quiz.map((q, idx) => (
                  <div key={idx} className="bg-secondary/50 border border-border/30 rounded-lg p-3">
                    <div className="text-xs font-semibold mb-2">{q.q}</div>
                    <div className="flex gap-2 flex-wrap">
                      {q.a.map((opt, oi) => (
                        <button key={oi} onClick={() => answer(m.id, oi === q.correct)} className="px-2 py-1 rounded-lg text-xs bg-card border border-border hover:border-primary/30">{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              </motion.div>
            )}
            </AnimatePresence>
          </GlassCard>
        ))}
      </div>

      {/* Calculators */}
      <GlassCard className="overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border/50 flex items-center gap-2 flex-wrap">
          <Calculator className="w-4 h-4 text-primary"/><span className="font-display text-[13px] font-bold">Interactive Calculators</span>
          <div className="ml-auto flex gap-1 bg-secondary rounded-lg p-1">
            {(['compound','retire','mortgage'] as const).map(t=>(
              <button key={t} onClick={()=>setCalcTab(t)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize ${calcTab===t?'bg-primary text-primary-foreground':'text-muted-foreground hover:text-foreground'}`}>{t==='compound'?'Compound':t==='retire'?'Retirement':'Mortgage'}</button>
            ))}
          </div>
        </div>
        <div className="p-3.5">
          {calcTab==='compound' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Principal (KES)</span><input type="number" value={ci.principal} onChange={e=>setCi(s=>({...s,principal:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Rate %</span><input type="number" value={ci.rate} onChange={e=>setCi(s=>({...s,rate:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Years</span><input type="number" value={ci.years} onChange={e=>setCi(s=>({...s,years:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="text-[11px] text-muted-foreground">Future Value</div>
                  <div className="font-mono text-xl font-bold text-primary">KES {Math.round(ciResult.fv).toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Interest earned: <span className="font-mono font-semibold text-foreground">KES {Math.round(ciResult.interest).toLocaleString()}</span></div>
                </div>
                <div className="text-[10px] text-muted-foreground">Formula: FV = P × (1+r)^n — live chart on right.</div>
              </div>
              <div className="h-[200px] bg-secondary/30 rounded-lg p-2 border border-border/30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ciResult.data}>
                    <defs><linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160 60% 52%)" stopOpacity={0.25}/><stop offset="100%" stopColor="hsl(160 60% 52%)" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="year" tick={{fontSize:10, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} tickFormatter={v=> (v/1000).toFixed(0)+'k'} width={45}/>
                    <Tooltip contentStyle={{background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:11}} formatter={(v:number)=>['KES '+Math.round(v).toLocaleString(),'Value']}/>
                    <Area type="monotone" dataKey="value" stroke="hsl(160 60% 52%)" fill="url(#ciGrad)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {calcTab==='retire' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Current Age</span><input type="number" value={ret.currentAge} onChange={e=>setRet(s=>({...s,currentAge:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Retire Age</span><input type="number" value={ret.retireAge} onChange={e=>setRet(s=>({...s,retireAge:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Monthly (KES)</span><input type="number" value={ret.monthly} onChange={e=>setRet(s=>({...s,monthly:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Return %</span><input type="number" value={ret.rate} onChange={e=>setRet(s=>({...s,rate:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="text-[11px] text-muted-foreground">At retirement ({ret.retireAge} yrs)</div>
                  <div className="font-mono text-xl font-bold text-primary">KES {Math.round(retResult.fv).toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground">{retResult.months} contributions · {ret.rate}% p.a.</div>
                </div>
              </div>
              <div className="h-[200px] bg-secondary/30 rounded-lg p-2 border border-border/30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retResult.data}>
                    <defs><linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(218 90% 66%)" stopOpacity={0.25}/><stop offset="100%" stopColor="hsl(218 90% 66%)" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="year" tick={{fontSize:10, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10, fill:'hsl(var(--muted-foreground))'}} axisLine={false} tickLine={false} tickFormatter={v=> (v/1000000).toFixed(1)+'M'} width={45}/>
                    <Tooltip contentStyle={{background:'hsl(var(--card))', border:'1px solid hsl(var(--border))', borderRadius:8, fontSize:11}}/>
                    <Area type="monotone" dataKey="value" stroke="hsl(218 90% 66%)" fill="url(#retGrad)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {calcTab==='mortgage' && (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Loan (KES)</span><input type="number" value={mort.principal} onChange={e=>setMort(s=>({...s,principal:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Rate %</span><input type="number" value={mort.rate} onChange={e=>setMort(s=>({...s,rate:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                  <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Years</span><input type="number" value={mort.years} onChange={e=>setMort(s=>({...s,years:Number(e.target.value)}))} className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono outline-none focus:border-primary"/></label>
                </div>
                <div className="bg-secondary rounded-lg p-3 border border-border/30 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Monthly payment</span><span className="font-mono font-bold">KES {Math.round(mortResult.monthly).toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total paid</span><span className="font-mono">KES {Math.round(mortResult.total).toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Interest</span><span className="font-mono text-destructive">KES {Math.round(mortResult.interest).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/30 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-semibold"><Home className="w-4 h-4 text-primary"/> Mortgage insight</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">At {mort.rate}% over {mort.years} years, you pay <strong className="text-foreground">{((mortResult.interest/mort.principal)*100).toFixed(1)}%</strong> extra in interest. Consider a shorter tenure or higher down-payment to save KES {(mortResult.interest*0.2).toLocaleString()}.</p>
                <div className="mt-3 h-2 bg-muted/30 rounded-full overflow-hidden flex"><div className="h-full bg-primary" style={{width: `${mort.principal/mortResult.total*100}%`}}/><div className="h-full bg-destructive/60" style={{width: `${mortResult.interest/mortResult.total*100}%`}}/></div>
                <div className="flex gap-3 text-[10px] mt-1"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary"/>Principal</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/60"/>Interest</span></div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <AnimatePresence>
        {showCert && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={()=>setShowCert(false)}>
            <motion.div initial={{scale:0.92,y:12}} animate={{scale:1,y:0}} exit={{scale:0.92,opacity:0}} onClick={e=>e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md text-center shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto"><Award className="w-7 h-7 text-amber-600"/></div>
              <div className="font-display text-xl font-extrabold mt-3">Certificate of Completion</div>
              <div className="text-xs text-muted-foreground mt-1">Awarded to <strong className="text-foreground">{user?.email || 'Learner'}</strong> for completing all 4 modules</div>
              <div className="mt-4 bg-secondary rounded-xl p-4 border border-border text-xs leading-relaxed">
                Mevest Africa — Financial Literacy Program<br/><span className="font-mono text-muted-foreground">{new Date().toLocaleDateString()} · {completed.size*25} XP · {streak} day streak</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={()=>{navigator.clipboard.writeText('Mevest Certificate — '+ (user?.email||'learner')); toast({title:'Certificate link copied'});}} className="flex-1 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold">Copy link</button>
                <button onClick={()=>setShowCert(false)} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Awesome!</button>
              </div>
              <button onClick={()=>setShowCert(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4"/></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
