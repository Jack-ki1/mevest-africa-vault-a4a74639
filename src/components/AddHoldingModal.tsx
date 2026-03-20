import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { X } from 'lucide-react';

interface AddHoldingModalProps {
  open: boolean;
  onClose: () => void;
}

const ASSET_TYPES = ['Stock', 'Cryptocurrency', 'ETF', 'Bond', 'T-Bill', 'Commodity'];
const EXCHANGES = ['NASDAQ', 'NYSE', 'LSE', 'NSE (Kenya)', 'JSE', 'Crypto'];
const CURRENCIES = ['USD', 'KES', 'GBP', 'EUR'];

export default function AddHoldingModal({ open, onClose }: AddHoldingModalProps) {
  const { addHolding } = usePortfolio();
  const [form, setForm] = useState({
    type: 'Stock', symbol: '', exchange: 'NASDAQ', qty: '', price: '', date: '', currency: 'USD', notes: '',
  });

  if (!open) return null;

  const handleSubmit = () => {
    const sym = form.symbol.toUpperCase().trim();
    const qty = parseFloat(form.qty);
    const price = parseFloat(form.price);
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return;

    const typeMap: Record<string, string> = { stock: 'stock', cryptocurrency: 'cryptocurrency', etf: 'etf', bond: 'bond', 't-bill': 'bond', commodity: 'commodity' };
    addHolding({
      sym,
      name: sym,
      type: typeMap[form.type.toLowerCase()] || 'stock',
      shares: qty,
      cost: price,
    });
    setForm({ type: 'Stock', symbol: '', exchange: 'NASDAQ', qty: '', price: '', date: '', currency: 'USD', notes: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[480px] max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-[22px] py-[18px] pb-[14px] border-b border-border flex items-center">
          <span className="font-display font-bold text-base">Add Holding</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-[22px] py-[18px] space-y-3.5">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Asset Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
              {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-[11px]">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Symbol / Ticker</label>
              <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="e.g. AAPL" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Exchange</label>
              <select value={form.exchange} onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                {EXCHANGES.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[11px]">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Quantity / Shares</label>
              <input value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} type="number" placeholder="0.00" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Avg Buy Price</label>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="0.00" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[11px]">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Purchase Date</label>
              <input value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} type="date" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Long-term hold..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
          </div>
        </div>
        <div className="px-[22px] py-[14px] border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:text-foreground">Cancel</button>
          <button onClick={handleSubmit} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">Add Holding</button>
        </div>
      </div>
    </div>
  );
}
