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
    </main>
    <footer className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-600">PriceRight is an independent tool, not affiliated with Etsy or eBay.</footer>
  </>);
}
