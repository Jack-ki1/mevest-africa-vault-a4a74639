import { describe, it, expect } from "vitest";
import { formatMoney, formatPct, formatPrice, genLine } from "@/data/market-data";

describe("formatMoney", () => {
  it("formats billions", () => expect(formatMoney(1.5e9)).toBe("$1.50B"));
  it("formats millions", () => expect(formatMoney(2.3e6)).toBe("$2.30M"));
  it("formats thousands", () => expect(formatMoney(1500)).toBe("$1.5K"));
  it("formats small", () => expect(formatMoney(42.5)).toBe("$42.50"));
  it("handles negative", () => expect(formatMoney(-1.5e9)).toBe("$-1.50B"));
});

describe("formatPct", () => {
  it("positive adds +", () => expect(formatPct(1.234)).toBe("+1.23%"));
  it("negative keeps -", () => expect(formatPct(-2.5)).toBe("-2.50%"));
  it("zero", () => expect(formatPct(0)).toBe("+0.00%"));
});

describe("formatPrice", () => {
  it("large price no decimals", () => expect(formatPrice(2340.5)).toBe("2,341"));
  it("normal price 2 decimals", () => expect(formatPrice(42.123)).toBe("42.12"));
  it("small price 4 decimals", () => expect(formatPrice(0.5821)).toBe("0.5821"));
});

describe("genLine", () => {
  it("generates correct length", () => {
    const line = genLine(100, 10);
    expect(line.length).toBe(11);
    expect(line[0]).toBe(100);
  });
  it("stays positive with reasonable vol", () => {
    const line = genLine(100, 100, 0, 0.01);
    expect(line.every(v => v > 0)).toBe(true);
  });
});
