import { describe, expect, it } from "vitest";
import type { Inputs } from "./calc";
import { breakEvenPrice, calculateAt, parseMoney, priceForMargin, priceForProfit, scenarios } from "./calc";
import { calculateMarketplaceFees } from "./fees";
const base: Inputs = { marketplace: "etsy", productCost: 12, shippingCost: 5, shippingPaidBy: "seller", shippingCharged: 0, adMode: "none", adPercent: 0, highVolume: false };
const ebay: Inputs = { ...base, marketplace: "ebay" };
const buyer = (charged: number, cost = 5): Inputs => ({ ...base, shippingPaidBy: "buyer", shippingCharged: charged, shippingCost: cost });
const cents = (n: number) => Math.round(n * 100 + Number.EPSILON) / 100;
const etsyFee = (b: number) => cents(0.065 * b) + cents(0.03 * b + 0.25) + 0.2; // components rounded to cents

describe("fee base & shipping", () => {
  it("buyer pays $0 shipping", () => { const r = calculateAt(buyer(0), 30); expect(r.customerPays).toBe(30); expect(r.fees.totalFees).toBeCloseTo(etsyFee(30), 9); });
  it("buyer pays $5: fees are charged on item + shipping", () => {
    const r = calculateAt(buyer(5), 30);
    expect(r.customerPays).toBe(35); expect(r.fees.feeBase).toBe(35);
    expect(r.fees.totalFees).toBeCloseTo(etsyFee(35), 9);
    expect(r.profit).toBeCloseTo(35 - 12 - 5 - etsyFee(35), 9);
  });
  it("seller pays $5: no fee on shipping, but cost is subtracted", () => {
    const r = calculateAt(base, 30);
    expect(r.fees.feeBase).toBe(30); expect(r.profit).toBeCloseTo(30 - 12 - 5 - etsyFee(30), 9);
  });
  it("buyer pays $5 but actual cost is $7", () => {
    const r = calculateAt(buyer(5, 7), 30);
    expect(r.profit).toBeCloseTo(35 - 12 - 7 - etsyFee(35), 9);
  });
  it("item $10 and $100 (Etsy)", () => {
    expect(calculateAt(base, 10).fees.totalFees).toBeCloseTo(1.4, 9);
    expect(calculateAt(base, 100).fees.totalFees).toBeCloseTo(9.95, 9);
  });
});
describe("eBay per-order fee and tiers", () => {
  const fee = (item: number, ship = 0) => calculateMarketplaceFees("ebay", { itemPrice: item, shippingCharged: ship, adMode: "none", adPercent: 0, highVolume: false });
  it("exactly $10 -> $0.30", () => expect(fee(10).perOrderFees).toBe(0.3));
  it("$10.01 -> $0.40", () => expect(fee(10.01).perOrderFees).toBe(0.4));
  it("order total (item + shipping) decides the tier", () => { expect(fee(6, 4).perOrderFees).toBe(0.3); expect(fee(6, 4.01).perOrderFees).toBe(0.4); });
  it("no separate processing fee: total = FVF + per-order fee only", () => {
    for (const [item, ship] of [[10, 0], [10.01, 0], [100, 0], [29.99, 5], [8000, 12]]) {
      const f = fee(item, ship);
      expect(f.processingFees).toBe(0);
      expect(f.totalFees).toBeCloseTo(f.transactionFees + f.perOrderFees, 12);
    }
    expect(fee(10).totalFees).toBeCloseTo(1.36 + 0.3, 9);    // $10.00 order
    expect(fee(10.01).totalFees).toBe(1.76);
  });
  it("FVF is charged on item + buyer-paid shipping", () => {
    expect(fee(29.99, 5).transactionFees).toBe(4.76);
    expect(fee(29.99, 5).feeBase).toBeCloseTo(34.99, 9);
  });
  it("13.6% FVF, and 2.35% above $7,500", () => {
    expect(fee(100).transactionFees).toBeCloseTo(13.6, 9);
    expect(fee(8000).transactionFees).toBeCloseTo(0.136 * 7500 + 0.0235 * 500, 9);
  });
});
describe("Etsy Offsite Ads", () => {
  const ads = (item: number, hv = false) => calculateMarketplaceFees("etsy", { itemPrice: item, shippingCharged: 0, adMode: "offsite", adPercent: 0, highVolume: hv }).advertisingFees;
  it("15% standard", () => expect(ads(100)).toBeCloseTo(15, 9));
  it("12% for $10k+ shops", () => expect(ads(100, true)).toBeCloseTo(12, 9));
  it("capped at $100 per order", () => { expect(ads(1000)).toBe(100); expect(ads(5000, true)).toBe(100); });
  it("15% applies to item + shipping", () =>
    expect(calculateMarketplaceFees("etsy", { itemPrice: 80, shippingCharged: 20, adMode: "offsite", adPercent: 0, highVolume: false }).advertisingFees).toBeCloseTo(15, 9));
});
// Closed form (Etsy, no ads): item = (T + c + x + f)/(1 - r) - s, with r = 9.5%, f = $0.45
describe("solver uses the same engine", () => {
  it("required price for $10 profit, seller pays shipping", () => {
    const p = priceForProfit(base, 10)!;
    expect(p).toBeCloseTo((10 + 12 + 5 + 0.45) / 0.905, 1);
    expect(calculateAt(base, p).profit).toBeGreaterThanOrEqual(10 - 1e-9);
  });
  it("required price for $10 profit, buyer pays $5 (cost $7)", () => {
    const i = buyer(5, 7); const p = priceForProfit(i, 10)!;
    expect(p).toBeCloseTo((10 + 12 + 7 + 0.45) / 0.905 - 5, 1);
    expect(calculateAt(i, p).profit).toBeGreaterThanOrEqual(10 - 1e-9);
  });
  it("35% margin of customer payment", () => {
    const i = buyer(5, 7); const p = priceForMargin(i, 0.35)!;
    expect(p).toBeCloseTo((12 + 7 + 0.45) / (1 - 0.095 - 0.35) - 5, 1);
    expect(calculateAt(i, p).margin!).toBeGreaterThanOrEqual(0.35 - 1e-9);
  });
  it("offsite ads and eBay", () => {
    expect(priceForProfit({ ...base, adMode: "offsite" }, 10)!).toBeCloseTo((10 + 17 + 0.45) / 0.755, 1);
    expect(priceForProfit(ebay, 10)!).toBeCloseTo((10 + 17 + 0.4) / 0.864, 1); // 13.6% + $0.40 only, no 2.9%
  });
  it("target price uses cent-rounded eBay fees consistently with displayed profit", () => {
    const i: Inputs = { ...ebay, productCost: 20, shippingCost: 5 };
    const p = priceForProfit(i, 10)!;
    expect(p).toBe(40.97);
    expect(calculateAt(i, p).fees.transactionFees).toBe(5.57);
    expect(calculateAt(i, p).profit).toBe(10);
    expect(calculateAt(i, p - 0.01).profit).toBeLessThan(10);
  });
  it("uses the lowest cent price that reaches a target after fee rounding", () => {
    const i: Inputs = { ...ebay, productCost: 20, shippingCost: 5 };
    const p = priceForProfit(i, 1)!;
    expect(p).toBe(30.55);
    expect(calculateAt(i, p).profit).toBe(1);
    expect(calculateAt(i, p - 0.01).profit).toBeLessThan(1);
  });
  it("break-even: one cent lower loses money", () => {
    const i = buyer(5, 7); const p = breakEvenPrice(i)!;
    expect(calculateAt(i, p).profit).toBeGreaterThanOrEqual(-1e-9);
    expect(calculateAt(i, p - 0.01).profit).toBeLessThan(0);
  });
  it("scenario rows equal direct calculation", () => {
    for (const s of scenarios(buyer(5, 7), 30)) expect(s.profit).toBe(calculateAt(buyer(5, 7), s.itemPrice).profit);
  });
  it("impossible targets return null", () => {
    expect(priceForMargin(base, 0.95)).toBeNull(); expect(priceForMargin(base, 1.2)).toBeNull();
    expect(priceForMargin(base, 0)).toBeNull(); expect(priceForProfit(base, 1e9)).toBeNull();
  });
});
describe("parseMoney", () => {
  it.each([["", null], ["abc", null], ["-5", null], ["Infinity", null], ["1e9", null], ["$1,200.50", 1200.5], ["0", 0]])("%s", (s, e) => expect(parseMoney(s as string)).toBe(e));
});
