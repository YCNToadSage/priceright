// Fee engine (no React). Add a marketplace/category by writing a config + calculator and registering it.
// Official Etsy Help Center confirms: Offsite Ads fee capped at $100/order; 15% standard, 12% for shops with $10k+ in the past 365 days.
// Other rates below come from secondary fee guides citing Etsy/eBay (mid-2026) - re-verify against etsy.com/legal/fees and ebay.com selling-fees before launch.
export type MarketplaceId = "etsy" | "ebay";
export type AdMode = "none" | "custom" | "offsite";
export interface OrderData {
  itemPrice: number;        // item price only
  shippingCharged: number;  // shipping the buyer pays (0 if seller absorbs it)
  adMode: AdMode;
  adPercent: number;        // custom ad rate, % of fee base
  highVolume: boolean;      // Etsy: shop made $10k+ in past 365 days (12% Offsite Ads tier)
}
export interface FeeBreakdown {
  feeBase: number; // item + buyer-paid shipping (no sales tax modeled)
  transactionFees: number; processingFees: number; perOrderFees: number; listingFees: number; advertisingFees: number; totalFees: number;
  // eBay: transactionFees = final value fee, perOrderFees = per-order fee, processingFees = 0 (payment processing is inside the FVF).
}
export interface FeeCalculator {
  id: MarketplaceId; label: string; configLabel: string; supportsOffsite: boolean; assumptions: string;
  feeLabels: { transaction: string; processing: string; perOrder: string; listing: string };
  calculate(o: OrderData): FeeBreakdown;
}
// Fee amounts are modeled at cent precision so the fee breakdown, profit, and
// target-price solver all use the same monetary values. Fee bases/rates remain
// unrounded; each resulting fee component is rounded to the nearest cent.
const roundCents = (amount: number) => Math.sign(amount) * Math.round(Math.abs(amount) * 100 + Number.EPSILON) / 100;

const build = (feeBase: number, b: Omit<FeeBreakdown, "feeBase" | "totalFees">): FeeBreakdown => {
  const rounded = {
    transactionFees: roundCents(b.transactionFees),
    processingFees: roundCents(b.processingFees),
    perOrderFees: roundCents(b.perOrderFees),
    listingFees: roundCents(b.listingFees),
    advertisingFees: roundCents(b.advertisingFees),
  };
  return {
    feeBase,
    ...rounded,
    totalFees: roundCents(rounded.transactionFees + rounded.processingFees + rounded.perOrderFees + rounded.listingFees + rounded.advertisingFees),
  };
};

export interface EtsyConfig {
  listingFee: number; transactionRate: number; processingRate: number; processingFixed: number;
  offsiteRateStandard: number; offsiteRateHighVolume: number; offsiteCap: number;
}
export const ETSY_US_DEFAULT: EtsyConfig = {
  listingFee: 0.2, transactionRate: 0.065, processingRate: 0.03, processingFixed: 0.25,
  offsiteRateStandard: 0.15, offsiteRateHighVolume: 0.12, offsiteCap: 100,
};
export const createEtsyCalculator = (c: EtsyConfig): FeeCalculator => ({
  id: "etsy", label: "Etsy", configLabel: "Etsy (US) — Etsy Payments", supportsOffsite: true,
  assumptions: "Estimated using Etsy US standard fees: $0.20 listing, 6.5% transaction and 3% + $0.25 processing on item + shipping charged, and optional Offsite Ads (15%, or 12% for shops with $10,000+ in sales over the past year; max $100 per order). Sales tax is not modeled.",
  feeLabels: { transaction: "Transaction fee (6.5%)", processing: "Payment processing (3% + $0.25)", perOrder: "Per-order fee", listing: "Listing fee" },
  calculate(o) {
    const base = o.itemPrice + o.shippingCharged;
    const rate = o.highVolume ? c.offsiteRateHighVolume : c.offsiteRateStandard;
    const ads = o.adMode === "offsite" ? Math.min(rate * base, c.offsiteCap) : o.adMode === "custom" ? (o.adPercent / 100) * base : 0;
    return build(base, {
      transactionFees: c.transactionRate * base,
      processingFees: c.processingRate * base + c.processingFixed,
      perOrderFees: 0,
      listingFees: c.listingFee, // one listing fee per sale assumed
      advertisingFees: ads,
    });
  },
});

export interface EbayConfig {
  name: string;
  fvfTiers: { upTo: number; rate: number }[];   // marginal tiers on the fee base, last upTo = Infinity
  perOrder: { upTo: number; fee: number }[];    // first tier whose upTo >= fee base applies
}
// Category-specific configs go here later (e.g. EBAY_US_ATHLETIC_SHOES).
export const EBAY_US_MOST_CATEGORIES_NO_STORE: EbayConfig = {
  name: "eBay — Most categories — No Store",
  fvfTiers: [{ upTo: 7500, rate: 0.136 }, { upTo: Infinity, rate: 0.0235 }],
  perOrder: [{ upTo: 10, fee: 0.3 }, { upTo: Infinity, fee: 0.4 }],
};
export const createEbayCalculator = (c: EbayConfig): FeeCalculator => ({
  id: "ebay", label: "eBay", configLabel: c.name, supportsOffsite: false,
  assumptions: "Estimated using eBay’s standard fee configuration for most categories (no Store): 13.6% final value fee on item + shipping charged (2.35% above $7,500) plus $0.30 per order up to $10 or $0.40 above. Actual fees vary by category, seller status, Store subscription, and other factors. Sales tax and insertion fees are not modeled.",
  feeLabels: { transaction: "Final value fee (13.6%)", processing: "Payment processing", perOrder: "Per-order fee", listing: "Listing fee" },
  calculate(o) {
    const base = o.itemPrice + o.shippingCharged;
    let fvf = 0, prev = 0;
    for (const t of c.fvfTiers) { fvf += Math.max(Math.min(base, t.upTo) - prev, 0) * t.rate; prev = t.upTo; }
    const per = c.perOrder.find((t) => base <= t.upTo)!.fee;
    // No separate payment-processing fee on eBay (Managed Payments is included in the FVF).
    return build(base, { transactionFees: fvf, processingFees: 0, perOrderFees: per, listingFees: 0, advertisingFees: o.adMode === "custom" ? (o.adPercent / 100) * base : 0 });
  },
});

export const MARKETPLACES: Record<MarketplaceId, FeeCalculator> = {
  etsy: createEtsyCalculator(ETSY_US_DEFAULT),
  ebay: createEbayCalculator(EBAY_US_MOST_CATEGORIES_NO_STORE),
};
export const calculateMarketplaceFees = (m: MarketplaceId, o: OrderData) => MARKETPLACES[m].calculate(o);
