"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdMode, MarketplaceId } from "@/lib/fees";
import { MARKETPLACES } from "@/lib/fees";
import type { Inputs, ShippingPaidBy } from "@/lib/calc";
import { breakEvenPrice, calculateAt, money, parseMoney, pct, priceForMargin, priceForProfit, scenarios } from "@/lib/calc";
import { track } from "@/lib/analytics";

type Mode = "profit" | "price";
type Target = "profit" | "margin";
const field = "w-full rounded-lg border border-slate-400 bg-white px-3 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-700";

function Money({ id, label, hint, value, set, err }: { id: string; label: string; hint?: string; value: string; set: (v: string) => void; err?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {hint && <p id={`${id}-h`} className="mb-1 text-xs text-slate-600">{hint}</p>}
      <input id={id} inputMode="decimal" autoComplete="off" placeholder="0.00" value={value} onChange={(e) => set(e.target.value)}
        aria-invalid={!!err} aria-describedby={[hint ? `${id}-h` : "", err ? `${id}-e` : ""].join(" ").trim() || undefined} className={field} />
      {err && <p id={`${id}-e`} role="alert" className="mt-1 text-sm text-red-800">⚠ {err}</p>}
    </div>
  );
}
const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <tr className={bold ? "font-bold" : ""}><th scope="row" className="py-1.5 font-[inherit] font-normal">{k}</th><td className="py-1.5 text-right tabular-nums">{v}</td></tr>
);
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">{title}</h3>
    <table className="w-full text-left"><tbody className="divide-y divide-slate-200">{children}</tbody></table></section>
);

export default function Calculator() {
  const [mp, setMp] = useState<MarketplaceId>("etsy");
  const [mode, setMode] = useState<Mode>("profit");
  const [target, setTarget] = useState<Target>("profit");
  const [adMode, setAdMode] = useState<AdMode>("none");
  const [paidBy, setPaidBy] = useState<ShippingPaidBy>("seller");
  const [highVol, setHighVol] = useState(false);
  const [v, setV] = useState({ cost: "", ship: "", charged: "", price: "", adPct: "10", goal: "" });
  const started = useRef(false);
  const up = (k: keyof typeof v) => (x: string) => {
    if (!started.current) { started.current = true; track("calculator_started"); }
    setV((s) => ({ ...s, [k]: x }));
  };
  const cal = MARKETPLACES[mp];

  const cost = parseMoney(v.cost), ship = v.ship.trim() === "" ? 0 : parseMoney(v.ship);
  const charged = v.charged.trim() === "" ? 0 : parseMoney(v.charged);
  const price = parseMoney(v.price), goal = parseMoney(v.goal), adPct = parseMoney(v.adPct);
  const errs: Record<string, string> = {};
  const bad = "Enter a number from 0 to 1,000,000";
  if (v.cost.trim() === "") errs.cost = "Required"; else if (cost === null) errs.cost = bad;
  if (ship === null) errs.ship = bad;
  if (paidBy === "buyer" && charged === null) errs.charged = bad;
  if (mode === "profit") { if (v.price.trim() === "") errs.price = "Required"; else if (price === null) errs.price = bad; }
  if (mode === "price") {
    if (v.goal.trim() === "") errs.goal = "Required"; else if (goal === null) errs.goal = bad;
    else if (target === "margin" && goal >= 100) errs.goal = "Margin must be under 100%";
  }
  if (adMode === "custom" && (adPct === null || adPct >= 100)) errs.adPct = "Enter a percentage under 100";

  const out = useMemo(() => {
    if (Object.keys(errs).length || cost === null || ship === null) return null;
    const i: Inputs = { marketplace: mp, productCost: cost, shippingCost: ship, shippingPaidBy: paidBy, shippingCharged: charged ?? 0, adMode, adPercent: adPct ?? 0, highVolume: highVol };
    let p: number | null = price;
    if (mode === "price" && goal !== null) p = target === "profit" ? priceForProfit(i, goal) : priceForMargin(i, goal / 100);
    if (p === null) return { impossible: true as const };
    return { impossible: false as const, r: calculateAt(i, p), be: breakEvenPrice(i), rows: scenarios(i, p) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mp, mode, target, adMode, paidBy, highVol, v]);
  const ok = !!out && !out.impossible;
  useEffect(() => { if (ok) { track("calculation_completed", { marketplace: mp, mode }); track("scenario_viewed"); } }, [out, ok, mp, mode]);

  const seg = (on: boolean) => `flex-1 rounded-lg px-3 py-3 text-base font-medium border ${on ? "bg-emerald-800 text-white border-emerald-800" : "bg-white border-slate-400"}`;
  const r = out && !out.impossible ? out.r : null;

  return (
    <section id="calculator" aria-labelledby="calc-h" className="mx-auto max-w-3xl px-4 py-8">
      <h2 id="calc-h" className="mb-4 text-2xl font-bold">Pricing calculator</h2>
      <div className="space-y-5 rounded-xl border border-slate-300 bg-white p-4 sm:p-6">
        <fieldset><legend className="mb-1 text-sm font-medium">Marketplace</legend>
          <div className="flex gap-2">{Object.values(MARKETPLACES).map((m) => (
            <button key={m.id} type="button" aria-pressed={mp === m.id} className={seg(mp === m.id)}
              onClick={() => { setMp(m.id); if (!m.supportsOffsite && adMode === "offsite") setAdMode("none"); track("marketplace_selected", { marketplace: m.id }); }}>{m.label}</button>))}</div>
          <p className="mt-1 text-xs text-slate-600">Fee set: {cal.configLabel}</p>
        </fieldset>
        <fieldset><legend className="mb-1 text-sm font-medium">What do you want to know?</legend>
          <div className="flex gap-2">
            <button type="button" aria-pressed={mode === "profit"} className={seg(mode === "profit")} onClick={() => { setMode("profit"); track("calculation_mode_selected", { mode: "profit" }); }}>Calculate my profit</button>
            <button type="button" aria-pressed={mode === "price"} className={seg(mode === "price")} onClick={() => { setMode("price"); track("calculation_mode_selected", { mode: "price" }); }}>Find my required price</button>
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Money id="cost" label="Product cost ($)" value={v.cost} set={up("cost")} err={errs.cost} />
          <Money id="ship" label="Shipping cost to me ($)" hint="What you actually pay to ship one order." value={v.ship} set={up("ship")} err={errs.ship} />
        </div>
        <fieldset><legend className="mb-1 text-sm font-medium">Shipping paid by</legend>
          <div className="flex gap-2">
            <button type="button" aria-pressed={paidBy === "seller"} className={seg(paidBy === "seller")} onClick={() => setPaidBy("seller")}>Seller (free shipping)</button>
            <button type="button" aria-pressed={paidBy === "buyer"} className={seg(paidBy === "buyer")} onClick={() => setPaidBy("buyer")}>Buyer</button>
          </div>
          <p className="mt-1 text-xs text-slate-600">{paidBy === "seller" ? "The buyer pays only the item price. Your shipping cost comes out of your profit." : "The buyer pays item + shipping. You still pay your real shipping cost, and the marketplace charges its fees on the shipping you collect too."}</p>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          {paidBy === "buyer" && <Money id="charged" label="Shipping charged to buyer ($)" value={v.charged} set={up("charged")} err={errs.charged} />}
          {mode === "profit" ? <Money id="price" label="Item price ($)" value={v.price} set={up("price")} err={errs.price} /> : (
            <div className="sm:col-span-2">
              <div className="mb-2 flex gap-2">
                <button type="button" aria-pressed={target === "profit"} className={seg(target === "profit")} onClick={() => setTarget("profit")}>Desired profit ($)</button>
                <button type="button" aria-pressed={target === "margin"} className={seg(target === "margin")} onClick={() => setTarget("margin")}>Desired margin (%)</button>
              </div>
              <Money id="goal" label={target === "profit" ? "Profit per sale ($)" : "Profit margin (% of what the customer pays)"} value={v.goal} set={up("goal")} err={errs.goal} />
            </div>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="ads" className="mb-1 block text-sm font-medium">Advertising</label>
            <select id="ads" value={adMode} onChange={(e) => setAdMode(e.target.value as AdMode)} className={field}>
              <option value="none">No advertising</option>
              <option value="custom">Custom % of order total</option>
              {cal.supportsOffsite && <option value="offsite">Etsy Offsite Ads (sale came from an ad)</option>}
            </select></div>
          {adMode === "custom" && <Money id="adPct" label="Advertising (% of order total)" value={v.adPct} set={up("adPct")} err={errs.adPct} />}
          {adMode === "offsite" && (
            <label className="flex items-start gap-3 self-end py-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={highVol} onChange={(e) => setHighVol(e.target.checked)} />
              <span>My shop made $10,000+ on Etsy in the past 12 months (12% rate instead of 15%)</span></label>)}
        </div>
      </div>

      <div aria-live="polite" className="mt-6">
        {out === null && <p className="text-slate-700">Enter your numbers above to see your result.</p>}
        {out?.impossible && <p role="alert" className="rounded-lg border border-red-800 bg-red-50 p-4 text-red-900">⚠ That target can’t be reached: fees plus your target take more than 100% of what the customer pays. Lower the margin or profit goal.</p>}
        {r && out && !out.impossible && (<>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[[mode === "price" ? "Recommended item price" : "Item price", money(r.itemPrice)], ["Estimated profit", money(r.profit)], ["Profit margin", pct(r.margin)]].map(([k, val]) => (
              <div key={k} className="rounded-xl border-2 border-emerald-800 bg-emerald-50 p-4"><dt className="text-sm font-medium">{k}</dt><dd className="text-3xl font-bold tabular-nums">{val}</dd></div>))}
          </dl>
          <p className="mt-1 text-xs text-slate-600">Margin = profit ÷ total the customer pays.</p>
          {r.profit < 0 && <p className="mt-3 font-medium text-red-900">⚠ At this price you lose money on every sale.</p>}

          <Block title="Customer pays">
            <Row k="Item" v={money(r.itemPrice)} /><Row k="Shipping" v={money(r.shippingCharged)} /><Row k="Total" v={money(r.customerPays)} bold />
          </Block>
          <Block title="Your costs">
            <Row k="Product" v={money(r.productCost)} /><Row k="Shipping (your actual cost)" v={money(r.shippingCost)} />
          </Block>
          <Block title={`Marketplace fees (on ${money(r.fees.feeBase)})`}>
            <Row k={cal.feeLabels.transaction} v={money(r.fees.transactionFees)} />
            {r.fees.processingFees > 0 && <Row k={cal.feeLabels.processing} v={money(r.fees.processingFees)} />}
            {r.fees.perOrderFees > 0 && <Row k={cal.feeLabels.perOrder} v={money(r.fees.perOrderFees)} />}
            {r.fees.listingFees > 0 && <Row k={cal.feeLabels.listing} v={money(r.fees.listingFees)} />}
            <Row k="Advertising" v={money(r.fees.advertisingFees)} />
            <Row k="Total fees" v={money(r.fees.totalFees)} bold />
          </Block>
          <div className="mt-4 rounded-xl border-2 border-emerald-800 p-4"><p className="text-xs font-bold uppercase tracking-wide">Your estimated profit</p>
            <p className="text-3xl font-bold tabular-nums">{money(r.profit)}</p></div>

          <p className="mt-5 text-lg"><strong>Break-even item price: {out.be === null ? "—" : money(out.be)}</strong></p>
          <p className="text-sm text-slate-700">The estimated item price required to cover your product, shipping, marketplace, and advertising costs.</p>

          <h3 className="mt-6 mb-2 text-lg font-bold">Price scenarios</h3>
          <div className="overflow-x-auto"><table className="w-full text-left tabular-nums">
            <thead><tr className="border-b-2 border-slate-400"><th className="py-2">Item price</th><th>Profit</th><th>Margin</th></tr></thead>
            <tbody>{out.rows.map((s) => { const rec = s.itemPrice === r.itemPrice; return (
              <tr key={s.itemPrice} className={rec ? "bg-emerald-100 font-bold" : ""}>
                <th scope="row" className="py-2 pl-1 font-[inherit]">{money(s.itemPrice)}{rec && <span className="ml-2 text-xs">← {mode === "price" ? "recommended" : "your price"}</span>}</th>
                <td>{money(s.profit)}</td><td>{pct(s.margin)}</td></tr>); })}</tbody></table></div>
        </>)}
      </div>
      <h3 className="mt-6 mb-1 text-lg font-bold">Assumptions</h3>
      <p className="text-sm text-slate-700">{cal.assumptions} Required price is solved against these same fees, not by adding percentages.</p>
      <p className="mt-3 text-sm text-slate-700">Estimated results. Actual marketplace fees may vary based on your category, seller status, account settings, taxes, advertising, and other charges.</p>
    </section>
  );
}
