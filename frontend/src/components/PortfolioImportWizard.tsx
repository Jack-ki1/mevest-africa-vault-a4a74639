import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ParsedRow { symbol: string; shares: number | null; cost_basis: number | null; currency: string; }

export default function PortfolioImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addHolding } = usePortfolio();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast({ title: 'Invalid CSV' }); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idxSym = headers.findIndex(h => ['symbol','ticker','code'].includes(h));
    const idxShares = headers.findIndex(h => ['shares','quantity','qty','units'].includes(h));
    const idxCost = headers.findIndex(h => ['cost','cost_basis','price','avg_cost','avg price'].includes(h));
    if (idxSym === -1) { toast({ title: 'Could not detect symbol column' }); return; }
    const parsed: ParsedRow[] = lines.slice(1).map(l => {
      const cols = l.split(',').map(c => c.trim());
      return { symbol: (cols[idxSym] || '').toUpperCase(), shares: idxShares !== -1 ? parseFloat(cols[idxShares]) || null : null, cost_basis: idxCost !== -1 ? parseFloat(cols[idxCost]) || null : null, currency: 'USD' };
    }).filter(r => r.symbol);
    setRows(parsed);
  };

  const handleImage = async (file: File) => {
    setLoading(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => { const s = String(r.result); res(s.includes(',') ? s.split(',')[1] : s); };
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('parse-statement', { body: { imageBase64: b64, mimeType: file.type } });
      if (error) throw error;
      const holdings = (data?.holdings || []) as ParsedRow[];
      setRows(holdings);
      if (!holdings.length) toast({ title: 'No holdings detected', description: data?.raw?.slice(0, 200) });
    } catch (e: unknown) {
      toast({ title: 'Parse failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
    setLoading(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (f.name.toLowerCase().endsWith('.csv')) handleCsv(f);
    else handleImage(f);
  };

  const [nlInput, setNlInput] = useState('');
  const handleNl = () => {
    // Simple nat-lang parse: "20 SCOM at 28 KES, 5 EQTY at 52"
    const parts = nlInput.split(/[,;]+/);
    const parsed: ParsedRow[] = [];
    for (const p of parts) {
      const m = p.match(/(\d+\.?\d*)\s+([A-Za-z.-]+)\s+at\s+(\d+\.?\d*)/i);
      if (m) parsed.push({ symbol: m[2].toUpperCase(), shares: parseFloat(m[1]), cost_basis: parseFloat(m[3]), currency: p.toLowerCase().includes('kes') ? 'KES' : 'USD' });
      else {
        const m2 = p.match(/([A-Za-z.-]+)\s+(\d+\.?\d*)\s*[x@]\s*(\d+\.?\d*)/i);
        if (m2) parsed.push({ symbol: m2[1].toUpperCase(), shares: parseFloat(m2[2]), cost_basis: parseFloat(m2[3]), currency: 'KES' });
      }
    }
    if (!parsed.length) toast({ title: 'Could not parse — try "20 SCOM at 28 KES, 5 EQTY at 52"' });
    else setRows((prev) => [...prev, ...parsed]);
  };

  const confirm = async () => {
    for (const r of rows) {
      if (!r.symbol || r.shares == null || r.cost_basis == null) continue;
      addHolding({ sym: r.symbol, name: r.symbol, type: 'stock', shares: r.shares, cost: r.cost_basis });
    }
    toast({ title: `${rows.length} holdings imported — please verify prices` });
    setRows([]); setFileName(''); setNlInput(''); onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-[560px] max-h-[80vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
        <div className="font-semibold mb-1">Import Portfolio</div>
        <div className="text-xs text-muted-foreground mb-3">Upload a broker CSV, PDF, or photo of your statement. Review before saving — misread numbers cost real money. Or describe holdings in plain language (Google patent).</div>
        <div className="flex gap-2 mb-3">
          <input value={nlInput} onChange={(e) => setNlInput(e.target.value)} placeholder='e.g. "20 SCOM at 28 KES, 5 EQTY at 52"' className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" />
          <button onClick={handleNl} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-semibold">Parse</button>
        </div>
        <input type="file" accept=".csv,image/*,.pdf" onChange={onFile} className="text-xs mb-3" />
        {fileName && <div className="text-xs text-muted-foreground mb-2">{fileName}</div>}
        {loading && <div className="text-xs text-primary">Parsing with vision model…</div>}
        {rows.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden mb-3">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border bg-secondary"><th className="p-2 text-left">Symbol</th><th className="p-2 text-right">Shares</th><th className="p-2 text-right">Cost</th><th className="p-2">Currency</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="p-2"><input value={r.symbol} onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, symbol: e.target.value.toUpperCase() } : x))} className="bg-secondary border border-border rounded px-1 py-0.5 w-24 font-mono text-xs" /></td>
                    <td className="p-2 text-right"><input type="number" value={r.shares ?? ''} onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, shares: parseFloat(e.target.value) || null } : x))} className="bg-secondary border border-border rounded px-1 py-0.5 w-20 text-right font-mono text-xs" /></td>
                    <td className="p-2 text-right"><input type="number" value={r.cost_basis ?? ''} onChange={e => setRows(prev => prev.map((x, j) => j === i ? { ...x, cost_basis: parseFloat(e.target.value) || null } : x))} className="bg-secondary border border-border rounded px-1 py-0.5 w-20 text-right font-mono text-xs" /></td>
                    <td className="p-2 text-xs">{r.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs border border-border">Cancel</button>
          <button onClick={confirm} disabled={!rows.length} className="px-3 py-1.5 rounded-lg text-xs bg-primary text-primary-foreground disabled:opacity-50">Confirm & Add ({rows.length})</button>
        </div>
      </div>
    </div>
  );
}
