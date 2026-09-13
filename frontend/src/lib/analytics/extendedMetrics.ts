export function twrr(returns: number[]): number {
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

export function mwrr(cashflows: { amount: number; t: number }[], endValue: number): number {
  // Simplified XIRR via Newton approximation: find r with NPV=0
  const npv = (r: number) => cashflows.reduce((s, cf) => s + cf.amount / Math.pow(1 + r, cf.t), 0) + endValue / Math.pow(1 + r, cashflows[cashflows.length - 1]?.t ?? 1);
  let r = 0.1;
  for (let i = 0; i < 20; i++) {
    const f = npv(r);
    const df = (npv(r + 1e-6) - f) / 1e-6;
    if (!isFinite(df) || df === 0) break;
    const nr = r - f / df;
    if (!isFinite(nr)) break;
    r = nr;
  }
  return r;
}

export function fifoCostBasis(txns: { side: 'buy'|'sell'; shares: number; price: number }[]): number {
  const lots: { shares: number; price: number }[] = [];
  for (const t of txns) {
    if (t.side === 'buy') lots.push({ shares: t.shares, price: t.price });
    else {
      let remain = t.shares;
      while (remain > 0 && lots.length) {
        const lot = lots[0];
        if (lot.shares <= remain) { remain -= lot.shares; lots.shift(); }
        else { lot.shares -= remain; remain = 0; }
      }
    }
  }
  const totalShares = lots.reduce((a, l) => a + l.shares, 0);
  const totalCost = lots.reduce((a, l) => a + l.shares * l.price, 0);
  return totalShares ? totalCost / totalShares : 0;
}

export function wacCostBasis(txns: { side: 'buy'|'sell'; shares: number; price: number }[]): number {
  let shares = 0, cost = 0;
  for (const t of txns) {
    if (t.side === 'buy') { shares += t.shares; cost += t.shares * t.price; }
    else {
      const avg = shares ? cost / shares : 0;
      shares -= t.shares;
      cost -= t.shares * avg;
      if (shares < 0) shares = 0;
      if (cost < 0) cost = 0;
    }
  }
  return shares ? cost / shares : 0;
}

export function withTransactionCosts(returns: number[], costBpsPerTrade: number, tradesPerYear: number): number[] {
  const perPeriod = (costBpsPerTrade / 10000) * (tradesPerYear / 252);
  return returns.map((r, i) => (i === 0 ? r : r - perPeriod));
}

export function regimeLabel(returns: number[]): 'bull' | 'bear' | 'neutral' {
  if (!returns.length) return 'neutral';
  const n = Math.min(50, returns.length);
  const sma50 = returns.slice(-n).reduce((a, b) => a + b, 0) / n;
  // annualized drift
  const drift = sma50 * 252;
  if (drift > 0.08) return 'bull';
  if (drift < -0.08) return 'bear';
  return 'neutral';
}
