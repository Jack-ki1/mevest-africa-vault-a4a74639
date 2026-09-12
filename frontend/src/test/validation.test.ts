import { describe, it, expect } from "vitest";

function validSymbol(s: unknown): boolean {
  return typeof s === "string" && /^[A-Z0-9.\-^=]{1,20}$/.test(s.toUpperCase());
}
function validatePositiveNum(v: unknown, max = 1e12): boolean {
  return typeof v === "number" && isFinite(v) && v > 0 && v <= max;
}

describe("validSymbol", () => {
  it("accepts normal symbols", () => {
    expect(validSymbol("AAPL")).toBe(true);
    expect(validSymbol("BTC-USD")).toBe(true);
    expect(validSymbol("SCOM.NR")).toBe(true);
    expect(validSymbol("^GSPC")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(validSymbol("")).toBe(false);
    expect(validSymbol("DROP TABLE")).toBe(false);
    expect(validSymbol("aapl; rm -rf")).toBe(false);
    expect(validSymbol(123 as unknown)).toBe(false);
    expect(validSymbol(null as unknown)).toBe(false);
  });
  it("rejects too long", () => {
    expect(validSymbol("A".repeat(21))).toBe(false);
    expect(validSymbol("A".repeat(20))).toBe(true);
  });
});

describe("validatePositiveNum", () => {
  it("accepts positive numbers", () => {
    expect(validatePositiveNum(10)).toBe(true);
    expect(validatePositiveNum(0.01)).toBe(true);
    expect(validatePositiveNum(1e12)).toBe(true);
  });
  it("rejects invalid", () => {
    expect(validatePositiveNum(0)).toBe(false);
    expect(validatePositiveNum(-5)).toBe(false);
    expect(validatePositiveNum(NaN)).toBe(false);
    expect(validatePositiveNum(Infinity)).toBe(false);
    expect(validatePositiveNum("10" as unknown)).toBe(false);
    expect(validatePositiveNum(1e13)).toBe(false);
  });
  it("respects custom max", () => {
    expect(validatePositiveNum(500, 100)).toBe(false);
    expect(validatePositiveNum(50, 100)).toBe(true);
  });
});
