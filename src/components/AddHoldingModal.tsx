import { useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { MARKET } from '@/data/market-data';
import { marketApi } from '@/lib/api/market';
import { toast } from '@/hooks/use-toast';
import { X } from 'lucide-react';
import LiveSearchInput from '@/components/LiveSearchInput';

interface AddHoldingModalProps {
  open: boolean;
  onClose: () => void;
}

const ASSET_TYPES = [
  { value: 'stock', label: 'Stock / Equity' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'etf', label: 'ETF / REIT' },
  { value: 'bond', label: 'Bond' },
  { value: 'tbill', label: 'Treasury Bill' },
  { value: 'mmf', label: 'Money Market Fund' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'pension', label: 'Pension / Insurance' },
] as const;

type AssetType = typeof ASSET_TYPES[number]['value'];

const COUNTRIES = [
  { code: 'KE', label: 'Kenya', currency: 'KES', exchanges: ['NSE (Nairobi)'] },
  { code: 'US', label: 'United States', currency: 'USD', exchanges: ['NASDAQ', 'NYSE', 'AMEX'] },
  { code: 'GB', label: 'United Kingdom', currency: 'GBP', exchanges: ['LSE'] },
  { code: 'ZA', label: 'South Africa', currency: 'ZAR', exchanges: ['JSE'] },
  { code: 'NG', label: 'Nigeria', currency: 'NGN', exchanges: ['NGX'] },
  { code: 'EU', label: 'Europe (EUR)', currency: 'EUR', exchanges: ['Euronext', 'XETRA'] },
  { code: 'GLOBAL', label: 'Global / Crypto', currency: 'USD', exchanges: ['Crypto', 'OTC'] },
];

const KENYAN_MMFS = ['CIC MMF', 'Cytonn MMF', 'Sanlam MMF', 'Old Mutual MMF', 'ICEA Lion MMF', 'Britam MMF', 'GenAfrica MMF'];
const KENYAN_STOCKS = ['SCOM', 'EQTY', 'KCB', 'ABSA', 'BAT', 'EABL', 'KPLC', 'COOP', 'SBIC', 'DTK'];
const KE_BOND_TYPES = ['Infrastructure Bond', 'Fixed Coupon Bond', 'Floating Rate Bond', 'Green Bond', 'Retail Bond'];

const QUICK_ADDS: Record<string, string[]> = {
  stock: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA', 'AMZN'],
  crypto: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP'],
  etf: ['SPY', 'QQQ', 'VTI', 'IWM', 'EEM', 'GLD'],
  bond: [], tbill: [], mmf: [], commodity: ['GOLD', 'OIL'], real_estate: [], pension: [],
};

export default function AddHoldingModal({ open, onClose }: AddHoldingModalProps) {
  const { addHolding } = usePortfolio();
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [country, setCountry] = useState('US');
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const countryData = COUNTRIES.find(c => c.code === country) || COUNTRIES[1];
  const isKenya = country === 'KE';

  const quickAdds = useMemo(() => {
    if (isKenya && assetType === 'stock') return KENYAN_STOCKS.slice(0, 6);
    return QUICK_ADDS[assetType] || [];
  }, [assetType, isKenya]);

  if (!open) return null;

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSymbolChange = (val: string) => {
    const sym = val.toUpperCase();
    const asset = MARKET[sym];
    setForm(f => ({ ...f, symbol: val, ...(asset ? { price: String(asset.price) } : {}) }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (['stock', 'crypto', 'etf', 'commodity'].includes(assetType)) {
      if (!form.symbol?.trim()) e.symbol = 'Required';
      if (!form.qty || parseFloat(form.qty) <= 0) e.qty = 'Required';
      if (!form.price || parseFloat(form.price) <= 0) e.price = 'Required';
    }
    if (assetType === 'bond' || assetType === 'tbill') {
      if (!form.faceValue || parseFloat(form.faceValue) <= 0) e.faceValue = 'Required';
      if (!form.rate) e.rate = 'Required';
      if (!form.maturityDate) e.maturityDate = 'Required';
    }
    if (assetType === 'mmf') {
      if (!form.fundName?.trim()) e.fundName = 'Required';
      if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Required';
    }
    if (assetType === 'real_estate') {
      if (!form.propertyName?.trim()) e.propertyName = 'Required';
      if (!form.value || parseFloat(form.value) <= 0) e.value = 'Required';
    }
    if (assetType === 'pension') {
      if (!form.providerName?.trim()) e.providerName = 'Required';
      if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    let sym: string, name: string, shares: number, cost: number, type: string;

    if (['stock', 'crypto', 'etf', 'commodity'].includes(assetType)) {
      sym = (form.symbol || '').toUpperCase().trim();
      const marketAsset = MARKET[sym];
      name = marketAsset?.name || form.name || sym;
      shares = parseFloat(form.qty || '0');
      cost = parseFloat(form.price || '0');
      type = assetType === 'crypto' ? 'cryptocurrency' : assetType;
    } else if (assetType === 'bond' || assetType === 'tbill') {
      sym = (form.bondId || assetType.toUpperCase() + '-' + Date.now()).toUpperCase();
      name = form.bondName || (assetType === 'tbill' ? 'Treasury Bill' : 'Bond') + ' ' + (form.rate || '') + '%';
      shares = 1;
      cost = parseFloat(form.faceValue || '0');
      type = 'bond';
    } else if (assetType === 'mmf') {
      sym = 'MMF-' + (form.fundName || '').replace(/\s/g, '').slice(0, 6).toUpperCase();
      name = form.fundName === 'other' ? (form.customFund || 'Money Market Fund') : (form.fundName || 'Money Market Fund');
      shares = 1;
      cost = parseFloat(form.amount || '0');
      type = 'stock';
    } else if (assetType === 'real_estate') {
      sym = 'RE-' + Date.now().toString().slice(-6);
      name = form.propertyName || 'Real Estate';
      shares = 1;
      cost = parseFloat(form.value || '0');
      type = 'stock';
    } else {
      sym = 'PEN-' + Date.now().toString().slice(-6);
      name = form.providerName || 'Pension';
      shares = 1;
      cost = parseFloat(form.amount || '0');
      type = 'stock';
    }

    addHolding({ sym, name, type, shares, cost });
    toast({ title: `${name} added`, description: `Added to your portfolio successfully.` });
    setForm({});
    setErrors({});
    setAssetType('stock');
    onClose();
  };

  const inputCls = (field: string) =>
    `w-full bg-muted border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary transition-colors ${errors[field] ? 'border-destructive' : 'border-border'}`;
  const selectCls = 'w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5';

  const renderFields = () => {
    switch (assetType) {
      case 'stock':
      case 'etf':
      case 'commodity':
        return (
          <>
            <div>
              <label className={labelCls}>Search & Select Asset</label>
              <LiveSearchInput
                onSelect={async (sym, name, exchange) => {
                  setForm(f => ({ ...f, symbol: sym, name, exchange: exchange || f.exchange || '' }));
                  try {
                    const q = await marketApi.getQuotes([sym]);
                    if (q[sym]) setForm(f => ({ ...f, price: String(q[sym].price.toFixed(2)) }));
                  } catch {}
                }}
                placeholder="Search any stock, ETF, crypto..."
                size="sm"
                value={form.symbol}
                onValueChange={val => update('symbol', val)}
                typeFilter={assetType === 'etf' ? 'etf' : assetType === 'commodity' ? 'commodity' : 'stock'}
              />
              {errors.symbol && <span className="text-[10px] text-destructive mt-0.5 block">{errors.symbol}</span>}
            </div>
            {isKenya && assetType === 'stock' && (
              <div>
                <label className={labelCls}>NSE Sector</label>
                <select value={form.sector || ''} onChange={e => update('sector', e.target.value)} className={selectCls}>
                  <option value="">Select Sector</option>
                  {['Banking', 'Insurance', 'Manufacturing', 'Agricultural', 'Commercial & Services', 'Telecom', 'Energy & Petroleum', 'Investment'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Quantity / Units</label>
                <input value={form.qty || ''} onChange={e => update('qty', e.target.value)} type="number" placeholder="0.00" className={inputCls('qty')} />
                {errors.qty && <span className="text-[10px] text-destructive mt-0.5 block">{errors.qty}</span>}
              </div>
              <div>
                <label className={labelCls}>Avg Buy Price ({countryData.currency})</label>
                <input value={form.price || ''} onChange={e => update('price', e.target.value)} type="number" placeholder="0.00" className={inputCls('price')} />
                {errors.price && <span className="text-[10px] text-destructive mt-0.5 block">{errors.price}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Purchase Date</label>
                <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
              </div>
              <div>
                <label className={labelCls}>Broker / Platform</label>
                <input value={form.broker || ''} onChange={e => update('broker', e.target.value)} placeholder={isKenya ? 'e.g. AIB-AXYS, Faida' : 'e.g. Interactive Brokers'} className={inputCls('broker')} />
              </div>
            </div>
          </>
        );

      case 'crypto':
        return (
          <>
            <div>
              <label className={labelCls}>Search Coin / Token</label>
              <LiveSearchInput
                onSelect={async (sym, name) => {
                  setForm(f => ({ ...f, symbol: sym, name }));
                  try {
                    const q = await marketApi.getQuotes([sym]);
                    if (q[sym]) setForm(f => ({ ...f, price: String(q[sym].price.toFixed(2)) }));
                  } catch {}
                }}
                placeholder="Search BTC, ETH, SOL..."
                size="sm"
                value={form.symbol}
                onValueChange={val => update('symbol', val)}
                typeFilter="crypto"
              />
              {errors.symbol && <span className="text-[10px] text-destructive mt-0.5 block">{errors.symbol}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Network</label>
                <select value={form.network || ''} onChange={e => update('network', e.target.value)} className={selectCls}>
                  <option value="">Select</option>
                  {['Bitcoin', 'Ethereum', 'Solana', 'BSC', 'Polygon', 'Avalanche', 'Other'].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Quantity</label>
                <input value={form.qty || ''} onChange={e => update('qty', e.target.value)} type="number" step="any" placeholder="0.00000000" className={inputCls('qty')} />
                {errors.qty && <span className="text-[10px] text-destructive mt-0.5 block">{errors.qty}</span>}
              </div>
              <div>
                <label className={labelCls}>Avg Buy Price (USD)</label>
                <input value={form.price || ''} onChange={e => update('price', e.target.value)} type="number" placeholder="0.00" className={inputCls('price')} />
                {errors.price && <span className="text-[10px] text-destructive mt-0.5 block">{errors.price}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Purchase Date</label>
                <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
              </div>
              <div>
                <label className={labelCls}>Wallet / Exchange</label>
                <input value={form.wallet || ''} onChange={e => update('wallet', e.target.value)} placeholder="e.g. Binance, MetaMask" className={inputCls('wallet')} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Staking?</label>
              <select value={form.staking || 'no'} onChange={e => update('staking', e.target.value)} className={selectCls}>
                <option value="no">Not Staking</option>
                <option value="yes">Staking / Earning Yield</option>
              </select>
            </div>
          </>
        );

      case 'bond':
        return (
          <>
            {isKenya && (
              <div>
                <label className={labelCls}>Bond Type</label>
                <select value={form.bondType || ''} onChange={e => update('bondType', e.target.value)} className={selectCls}>
                  <option value="">Select Bond Type</option>
                  {KE_BOND_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bond Name / ISIN</label>
                <input value={form.bondName || ''} onChange={e => update('bondName', e.target.value)} placeholder={isKenya ? 'e.g. IFB1/2024/18' : 'e.g. US10Y'} className={inputCls('bondName')} />
              </div>
              <div>
                <label className={labelCls}>Face Value ({countryData.currency})</label>
                <input value={form.faceValue || ''} onChange={e => update('faceValue', e.target.value)} type="number" placeholder={isKenya ? '50000' : '1000'} className={inputCls('faceValue')} />
                {errors.faceValue && <span className="text-[10px] text-destructive mt-0.5 block">{errors.faceValue}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Coupon Rate (%)</label>
                <input value={form.rate || ''} onChange={e => update('rate', e.target.value)} type="number" step="0.01" placeholder="e.g. 14.5" className={inputCls('rate')} />
                {errors.rate && <span className="text-[10px] text-destructive mt-0.5 block">{errors.rate}</span>}
              </div>
              <div>
                <label className={labelCls}>Maturity Date</label>
                <input value={form.maturityDate || ''} onChange={e => update('maturityDate', e.target.value)} type="date" className={inputCls('maturityDate')} />
                {errors.maturityDate && <span className="text-[10px] text-destructive mt-0.5 block">{errors.maturityDate}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Purchase Date</label>
                <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
              </div>
              <div>
                <label className={labelCls}>Payment Frequency</label>
                <select value={form.frequency || 'semi-annual'} onChange={e => update('frequency', e.target.value)} className={selectCls}>
                  <option value="annual">Annual</option>
                  <option value="semi-annual">Semi-Annual</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>
          </>
        );

      case 'tbill':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>T-Bill Tenor</label>
                <select value={form.tenor || '91'} onChange={e => update('tenor', e.target.value)} className={selectCls}>
                  <option value="91">91-Day</option>
                  <option value="182">182-Day</option>
                  <option value="364">364-Day</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Face Value ({countryData.currency})</label>
                <input value={form.faceValue || ''} onChange={e => update('faceValue', e.target.value)} type="number" placeholder={isKenya ? '100000' : '10000'} className={inputCls('faceValue')} />
                {errors.faceValue && <span className="text-[10px] text-destructive mt-0.5 block">{errors.faceValue}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Discount Rate (%)</label>
                <input value={form.rate || ''} onChange={e => update('rate', e.target.value)} type="number" step="0.01" placeholder="e.g. 16.2" className={inputCls('rate')} />
                {errors.rate && <span className="text-[10px] text-destructive mt-0.5 block">{errors.rate}</span>}
              </div>
              <div>
                <label className={labelCls}>Maturity Date</label>
                <input value={form.maturityDate || ''} onChange={e => update('maturityDate', e.target.value)} type="date" className={inputCls('maturityDate')} />
                {errors.maturityDate && <span className="text-[10px] text-destructive mt-0.5 block">{errors.maturityDate}</span>}
              </div>
            </div>
            <div>
              <label className={labelCls}>Auction Date</label>
              <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
            </div>
            {isKenya && (
              <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-[11px] text-muted-foreground">🇰🇪 Kenya T-Bills are issued by the Central Bank of Kenya (CBK). Minimum investment: KES 100,000.</p>
              </div>
            )}
          </>
        );

      case 'mmf':
        return (
          <>
            <div>
              <label className={labelCls}>Fund Name</label>
              {isKenya ? (
                <select value={form.fundName || ''} onChange={e => update('fundName', e.target.value)} className={selectCls}>
                  <option value="">Select Fund</option>
                  {KENYAN_MMFS.map(f => <option key={f}>{f}</option>)}
                  <option value="other">Other</option>
                </select>
              ) : (
                <input value={form.fundName || ''} onChange={e => update('fundName', e.target.value)} placeholder="e.g. Vanguard Federal MMF" className={inputCls('fundName')} />
              )}
              {errors.fundName && <span className="text-[10px] text-destructive mt-0.5 block">{errors.fundName}</span>}
            </div>
            {form.fundName === 'other' && (
              <div>
                <label className={labelCls}>Custom Fund Name</label>
                <input value={form.customFund || ''} onChange={e => update('customFund', e.target.value)} placeholder="Enter fund name" className={inputCls('customFund')} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount Invested ({countryData.currency})</label>
                <input value={form.amount || ''} onChange={e => update('amount', e.target.value)} type="number" placeholder="0.00" className={inputCls('amount')} />
                {errors.amount && <span className="text-[10px] text-destructive mt-0.5 block">{errors.amount}</span>}
              </div>
              <div>
                <label className={labelCls}>Current Yield (% p.a.)</label>
                <input value={form.yield || ''} onChange={e => update('yield', e.target.value)} type="number" step="0.01" placeholder="e.g. 12.5" className={inputCls('yield')} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Investment Date</label>
              <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
            </div>
            {isKenya && (
              <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-[11px] text-muted-foreground">🇰🇪 Money Market Funds in Kenya are regulated by CMA. Current average yield: ~12-16% p.a.</p>
              </div>
            )}
          </>
        );

      case 'real_estate':
        return (
          <>
            <div>
              <label className={labelCls}>Property Name / Description</label>
              <input value={form.propertyName || ''} onChange={e => update('propertyName', e.target.value)} placeholder="e.g. 2BR Apartment, Kilimani" className={inputCls('propertyName')} />
              {errors.propertyName && <span className="text-[10px] text-destructive mt-0.5 block">{errors.propertyName}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Property Type</label>
                <select value={form.propertyType || ''} onChange={e => update('propertyType', e.target.value)} className={selectCls}>
                  <option value="">Select</option>
                  {['Residential', 'Commercial', 'Land', 'REIT', 'Mixed-Use'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Current Value ({countryData.currency})</label>
                <input value={form.value || ''} onChange={e => update('value', e.target.value)} type="number" placeholder="0" className={inputCls('value')} />
                {errors.value && <span className="text-[10px] text-destructive mt-0.5 block">{errors.value}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Purchase Price ({countryData.currency})</label>
                <input value={form.purchasePrice || ''} onChange={e => update('purchasePrice', e.target.value)} type="number" placeholder="0" className={inputCls('purchasePrice')} />
              </div>
              <div>
                <label className={labelCls}>Monthly Rental Income</label>
                <input value={form.rental || ''} onChange={e => update('rental', e.target.value)} type="number" placeholder="0" className={inputCls('rental')} />
              </div>
            </div>
            {isKenya && (
              <div>
                <label className={labelCls}>Location</label>
                <select value={form.location || ''} onChange={e => update('location', e.target.value)} className={selectCls}>
                  <option value="">Select</option>
                  {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Other'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            )}
          </>
        );

      case 'pension':
        return (
          <>
            <div>
              <label className={labelCls}>Provider / Scheme Name</label>
              <input value={form.providerName || ''} onChange={e => update('providerName', e.target.value)} placeholder={isKenya ? 'e.g. NSSF, Britam Pension' : 'e.g. 401k, Pension Fund'} className={inputCls('providerName')} />
              {errors.providerName && <span className="text-[10px] text-destructive mt-0.5 block">{errors.providerName}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Product Type</label>
                <select value={form.productType || ''} onChange={e => update('productType', e.target.value)} className={selectCls}>
                  <option value="">Select</option>
                  {(isKenya
                    ? ['NSSF', 'Occupational Pension', 'Individual Pension', 'Provident Fund', 'Endowment', 'Education Policy']
                    : ['401(k)', 'IRA', 'Pension', 'Annuity', 'Life Insurance', 'Endowment']
                  ).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Current Value ({countryData.currency})</label>
                <input value={form.amount || ''} onChange={e => update('amount', e.target.value)} type="number" placeholder="0.00" className={inputCls('amount')} />
                {errors.amount && <span className="text-[10px] text-destructive mt-0.5 block">{errors.amount}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Monthly Contribution</label>
                <input value={form.contribution || ''} onChange={e => update('contribution', e.target.value)} type="number" placeholder="0" className={inputCls('contribution')} />
              </div>
              <div>
                <label className={labelCls}>Start Date</label>
                <input value={form.date || ''} onChange={e => update('date', e.target.value)} type="date" className={inputCls('date')} />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const typeLabel = ASSET_TYPES.find(t => t.value === assetType)?.label || 'Asset';
  const typeColors: Record<string, string> = {
    stock: 'bg-chart-blue/10 text-chart-blue', crypto: 'bg-amber/10 text-amber',
    etf: 'bg-chart-purple/10 text-chart-purple', bond: 'bg-primary/10 text-primary',
    tbill: 'bg-primary/10 text-primary', mmf: 'bg-chart-green/10 text-chart-green',
    commodity: 'bg-amber/10 text-amber', real_estate: 'bg-chart-purple/10 text-chart-purple',
    pension: 'bg-chart-blue/10 text-chart-blue',
  };

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${typeColors[assetType] || 'bg-muted text-muted-foreground'}`}>
            {typeLabel}
          </div>
          <span className="font-display font-bold text-base flex-1">Add Holding</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Asset Type</label>
              <select value={assetType} onChange={e => { setAssetType(e.target.value as AssetType); setForm({}); setErrors({}); }} className={selectCls}>
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Country / Market</label>
              <select value={country} onChange={e => { setCountry(e.target.value); setForm({}); setErrors({}); }} className={selectCls}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {renderFields()}

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input value={form.notes || ''} onChange={e => update('notes', e.target.value)} placeholder="e.g. Long-term hold..." className={inputCls('notes')} />
          </div>

          {quickAdds.length > 0 && (
            <div>
              <label className={labelCls}>Quick Add</label>
              <div className="flex gap-1.5 flex-wrap">
                {quickAdds.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const asset = MARKET[s];
                      if (asset) setForm(f => ({ ...f, symbol: s, price: String(asset.price) }));
                      else setForm(f => ({ ...f, symbol: s }));
                    }}
                    className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Add {typeLabel}</button>
        </div>
      </div>
    </div>
  );
}
