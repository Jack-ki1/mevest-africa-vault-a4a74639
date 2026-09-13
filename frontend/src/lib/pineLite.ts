// Pine-lite: tiny formula evaluator for Screener (SMA, RSI, close, etc.)
// Supports: SMA(close,20) > SMA(close,50) AND RSI < 70
import { sma, rsi } from '@/lib/analytics/indicators';

export function evaluatePineLite(formula: string, closes: number[]): boolean {
  if (!formula.trim()) return true;
  const smaRe = /SMA\s*\(\s*close\s*,\s*(\d+)\s*\)/gi;
  const rsiRe = /RSI\s*\(\s*(\d+)\s*\)/gi;
  // Replace SMA(close,N) with last value
  let expr = formula;
  const smaVals = new Map<string, number>();
  for (const m of formula.matchAll(smaRe)) {
    const n = parseInt(m[1], 10);
    const arr = sma(closes, n);
    const last = arr.filter((v) => v !== null).pop();
    smaVals.set(m[0], typeof last === 'number' ? last : 0);
  }
  for (const [k, v] of smaVals) expr = expr.split(k).join(String(v));
  const rsiVals = new Map<string, number>();
  for (const m of formula.matchAll(rsiRe)) {
    const n = parseInt(m[1], 10);
    const arr = rsi(closes, n);
    const last = arr.filter((v) => v !== null).pop();
    rsiVals.set(m[0], typeof last === 'number' ? last : 50);
  }
  for (const [k, v] of rsiVals) expr = expr.split(k).join(String(v));
  expr = expr.replace(/\bclose\b/gi, String(closes[closes.length - 1] ?? 0));
  expr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');
  // allow only numbers, comparators, &&, ||, (), ., -
  if (!/^[\d\s<>=!&|().-]+$/.test(expr)) return false;
  try {
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`"use strict"; return (${expr});`)());
  } catch { return false; }
}
