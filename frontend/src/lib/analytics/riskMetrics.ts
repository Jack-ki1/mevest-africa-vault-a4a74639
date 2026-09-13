export function dailyReturns(closes: number[]): number[] {
  return closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
}
export function volatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}
export function sharpeRatio(returns: number[], riskFreeRateAnnual = 0.15): number {
  if (returns.length < 2) return 0;
  const meanAnnual = (returns.reduce((a, b) => a + b, 0) / returns.length) * 252;
  const vol = volatility(returns);
  return vol === 0 ? 0 : (meanAnnual - riskFreeRateAnnual) / vol;
}
export function maxDrawdown(closes: number[]): { pct: number; peakIdx: number; troughIdx: number } {
  if (closes.length === 0) return { pct: 0, peakIdx: 0, troughIdx: 0 };
  let peak = closes[0], peakIdx = 0, worst = 0, worstPeakIdx = 0, worstTroughIdx = 0;
  closes.forEach((c, i) => {
    if (c > peak) { peak = c; peakIdx = i; }
    const dd = (c - peak) / peak;
    if (dd < worst) { worst = dd; worstPeakIdx = peakIdx; worstTroughIdx = i; }
  });
  return { pct: worst, peakIdx: worstPeakIdx, troughIdx: worstTroughIdx };
}
export function beta(assetReturns: number[], benchmarkReturns: number[]): number {
  const n = Math.min(assetReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;
  const a = assetReturns.slice(-n), b = benchmarkReturns.slice(-n);
  const meanA = a.reduce((x, y) => x + y, 0) / n, meanB = b.reduce((x, y) => x + y, 0) / n;
  const cov = a.reduce((s, x, i) => s + (x - meanA) * (b[i] - meanB), 0) / (n - 1);
  const varB = b.reduce((s, y) => s + (y - meanB) ** 2, 0) / (n - 1);
  return varB === 0 ? 0 : cov / varB;
}
export function cagr(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}
export function sortinoRatio(returns: number[], riskFreeRateAnnual = 0.15): number {
  if (returns.length < 2) return 0;
  const meanAnnual = (returns.reduce((a, b) => a + b, 0) / returns.length) * 252;
  const downside = returns.filter(r => r < 0);
  if (downside.length === 0) return 0;
  const meanDown = downside.reduce((a, b) => a + b, 0) / downside.length;
  const downVar = downside.reduce((a, b) => a + (b - meanDown) ** 2, 0) / (downside.length - 1 || 1);
  const downVol = Math.sqrt(downVar) * Math.sqrt(252);
  return downVol === 0 ? 0 : (meanAnnual - riskFreeRateAnnual) / downVol;
}
export function calmarRatio(cagrVal: number, maxDd: number): number {
  const dd = Math.abs(maxDd);
  return dd === 0 ? 0 : cagrVal / dd;
}
