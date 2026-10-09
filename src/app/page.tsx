import Calculator from "@/components/Calculator";
export default function Home() {
  return (<>
    <header className="border-b border-slate-300"><div className="mx-auto max-w-3xl px-4 py-3 text-xl font-bold">PriceRight</div></header>
    <main>
      <section className="mx-auto max-w-3xl px-4 pt-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Know what you need to charge.</h1>
        <p className="mt-3 text-lg text-slate-700">Calculate your real profit after marketplace fees, product costs, shipping, and advertising. Built for Etsy and eBay sellers. No account needed.</p>
        <a href="#calculator" className="mt-5 inline-block rounded-lg bg-emerald-800 px-5 py-3 font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">Open the calculator</a>
      </section>
           <Calculator />

      <section className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            Free Etsy &amp; eBay Profit Calculator
          </h2>
          <p className="mt-3 text-slate-700 leading-7">
            PriceRight helps online sellers estimate how much money they can
            keep from each sale. Use this free marketplace profit calculator
            to account for selling fees, product costs, shipping expenses,
            and advertising before deciding what to charge. No account is
            required.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            How to Calculate Your Selling Profit
          </h2>
          <ol className="mt-3 list-decimal pl-6 space-y-2 text-slate-700 leading-7">
            <li>
              <strong>Enter your selling details.</strong> Add your item
              price, product cost, shipping expenses, and other applicable
              costs.
            </li>
            <li>
              <strong>Account for marketplace fees.</strong> Include
              applicable selling, payment processing, and advertising fees
              to estimate your total costs.
            </li>
            <li>
              <strong>Review your results.</strong> Use your estimated fees,
              total costs, and profit to make more informed pricing decisions.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-semibold">
            Find a Price That Works for Your Business
          </h2>
          <p className="mt-3 text-slate-700 leading-7">
            A product that sells well does not always generate the profit
            you expect. Packaging, shipping, marketplace fees, and
            advertising can add up quickly. Estimating these expenses
            before listing a product can help you avoid underpricing.
          </p>
          <p className="mt-3 text-slate-700 leading-7">
            Use PriceRight to compare possible prices and see how they
            affect your estimated profit. Your actual earnings may vary
            based on your marketplace, seller account, category, advertising
            settings, and other applicable charges.
          </p>
        </div>
           </section>
    </main>
    <footer className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-600">
      PriceRight is an independent tool, not affiliated with Etsy or eBay.
    </footer>
  </>);
}