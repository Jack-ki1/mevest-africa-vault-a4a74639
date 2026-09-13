export function convert(amount: number, from: string, to: string, usdKes: number): number {
  if (from === to) return amount;
  if (from === 'KES' && to === 'USD') return amount / usdKes;
  if (from === 'USD' && to === 'KES') return amount * usdKes;
  // Default: treat unknown as USD
  if (to === 'KES') return amount * usdKes;
  return amount / usdKes;
}
export function formatWithCurrency(amount: number, currency: string): string {
  const locale = currency === 'KES' ? 'en-KE' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch { return `${currency} ${amount.toLocaleString()}`; }
}
