export default function PredictionEmbed() {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="font-display text-[13px] font-bold">Prediction Markets (via Polymarket)</div>
      <div className="text-[11px] text-muted-foreground">What will WTI hit in Aug 2026? · Fed cuts in 2026? — Perplexity’s virality pattern.</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { q: 'WTI > $85 Aug?', o1: '↑ $85 31%', o2: '↓ $80 12%' },
          { q: 'Fed cuts 2026?', o1: '0 cuts 88%', o2: '1 cut 9%' },
          { q: 'NSE 20 up week?', o1: 'Yes 54%', o2: 'No 46%' },
        ].map((p) => (
          <div key={p.q} className="bg-secondary rounded-lg p-2">
            <div className="text-[11px] font-semibold">{p.q}</div>
            <div className="text-[11px] font-mono mt-1"><span className="text-primary">{p.o1}</span> · <span className="text-muted-foreground">{p.o2}</span></div>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">Trade on Polymarket →</a>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground mt-2">Not advice — prediction market data for context only.</div>
    </div>
  );
}
