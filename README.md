# PriceRight (MVP)
Free Etsy/eBay profit & required-price calculator. Client-side only. No env vars, DB, auth, or APIs.

    npm install && npm run dev      # http://localhost:3000
    npm test                        # vitest: solver, break-even, parsing
    npx vercel                      # deploy

Structure: src/lib/fees.ts (configurable Etsy/eBay calculators + registry), src/lib/calc.ts (single calculateAt path, solver, scenarios), src/lib/analytics.ts, src/components/Calculator.tsx, src/app/{layout,page}.tsx.
src/lib/analytics.ts (event stub; calls window.plausible if present), src/components/Calculator.tsx, src/app/{layout,page}.tsx.
Add a marketplace: implement FeeCalculator in fees.ts and register it in MARKETPLACES.
