const MOCK = [
  { name: 'Hon. A. Mwangi', role: 'MP', symbol: 'SCOM.NR', action: 'Bought 50k shares', date: '2026-09-01' },
  { name: 'Sen. B. Otieno', role: 'Senator', symbol: 'KCB.NR', action: 'Filed disclosure', date: '2026-08-28' },
  { name: 'Gov. C. Wafula', role: 'Governor', symbol: 'EQTY.NR', action: 'Sold 20k shares', date: '2026-08-15' },
];
export default function GovTrackerMock() {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="font-display text-[13px] font-bold">Kenya Government Trading (mock — Perplexity pattern)</div>
      <div className="text-[11px] text-muted-foreground">Parliamentary disclosures — placeholder until KE registry API exists.</div>
      <table className="w-full text-xs mt-2">
        <thead><tr className="border-b border-border"><th className="text-left p-2">Leader</th><th className="text-left p-2">Action</th><th className="text-right p-2">Date</th></tr></thead>
        <tbody>{MOCK.map((r) => <tr key={r.name} className="border-b border-border/30"><td className="p-2"><span className="font-semibold">{r.name}</span> <span className="text-muted-foreground">{r.role}</span></td><td className="p-2">{r.action} {r.symbol}</td><td className="p-2 text-right font-mono">{r.date}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
