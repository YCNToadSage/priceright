import type { AdMode, FeeBreakdown, MarketplaceId } from "./fees";
import { calculateMarketplaceFees } from "./fees";
export const MAX_PRICE = 1_000_000;
export type ShippingPaidBy = "seller" | "buyer";
export interface Inputs {
  marketplace: MarketplaceId; productCost: number;
  shippingCost: number;            // what the seller actually spends to ship
  shippingPaidBy: ShippingPaidBy; shippingCharged: number; // charged to buyer (ignored if seller pays)
  adMode: AdMode; adPercent: number; highVolume: boolean;
}
export interface Result {
  itemPrice: number; shippingCharged: number; customerPays: number; // customerPays = fee base (no tax modeled)
  productCost: number; shippingCost: number; fees: FeeBreakdown;
  profit: number; margin: number | null; // margin = profit / customerPays
}
/** "12.50", "$1,200" -> number; null if blank/invalid/negative/non-finite/too large. */
export function parseMoney(s: string): number | null {
  const t = s.replace(/[$,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n <= MAX_PRICE ? n : null;
}
export const money = (n: number) =>
  Number.isFinite(n) ? (n < 0 ? "−" : "") + Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—";
export const pct = (n: number | null) => (n === null || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`);
const roundCents = (n: number) => Math.sign(n) * Math.round(Math.abs(n) * 100 + Number.EPSILON) / 100;

/** The single calculation path used by profit, solver, break-even and scenarios. */
export function calculateAt(i: Inputs, itemPrice: number): Result {
  const shippingCharged = i.shippingPaidBy === "buyer" ? i.shippingCharged : 0;
  const fees = calculateMarketplaceFees(i.marketplace, { itemPrice, shippingCharged, adMode: i.adMode, adPercent: i.adPercent, highVolume: i.highVolume });
  const customerPays = roundCents(itemPrice + shippingCharged);
  // Profit is a monetary result, so round it to cents before the solver compares it to a target.
  const profit = roundCents(customerPays - i.productCost - i.shippingCost - fees.totalFees);
  return { itemPrice, shippingCharged, customerPays, productCost: i.productCost, shippingCost: i.shippingCost, fees, profit, margin: customerPays > 0 ? profit / customerPays : null };
}
/** Smallest item price (to the cent) with gap >= 0, by bisection over the same fee engine (handles % fees, fixed fees, caps, tiers). null if unreachable. */
function solve(gap: (p: number) => number): number | null {
  if (!(gap(MAX_PRICE) >= 0)) return null;
  let lo = 0, hi = MAX_PRICE;
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (gap(mid) >= 0) hi = mid; else lo = mid; }
  let cents = Math.ceil(hi * 100 - 1e-6);
  while (gap(cents / 100) < -1e-9) cents++;
  return cents / 100;
}
export const breakEvenPrice = (i: Inputs) => solve((p) => calculateAt(i, p).profit);
export const priceForProfit = (i: Inputs, t: number) => solve((p) => calculateAt(i, p).profit - t);
export const priceForMargin = (i: Inputs, m: number) =>
  m > 0 && m < 1 ? solve((p) => { const r = calculateAt(i, p); return r.profit - m * r.customerPays; }) : null;
export function scenarios(i: Inputs, base: number): Result[] {
  return [0.8, 0.9, 1, 1.1, 1.2].map((f) => Math.round(base * f * 100) / 100)
    .filter((p, k, a) => p > 0 && a.indexOf(p) === k).map((p) => calculateAt(i, p));
}
