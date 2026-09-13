import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Currency = 'KES' | 'USD';
const Ctx = createContext<{ currency: Currency; setCurrency: (c: Currency) => void; usdKes: number } | null>(null);
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => (localStorage.getItem('mevest_currency') as Currency) || 'KES');
  const [usdKes, setUsdKes] = useState(129.5);
  useEffect(() => { localStorage.setItem('mevest_currency', currency); }, [currency]);
  useEffect(() => {
    supabase.from('kenya_rates').select('rate_pct').eq('instrument', 'USDKES').order('as_of', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data[0]) setUsdKes(Number((data[0] as { rate_pct: number }).rate_pct));
    });
  }, []);
  return <Ctx.Provider value={{ currency, setCurrency, usdKes }}>{children}</Ctx.Provider>;
}
export function useCurrency() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCurrency outside provider');
  return c;
}
