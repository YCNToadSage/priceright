import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
const desc = "Calculate your real profit, find your break-even price, and see what you should charge before you list on Etsy or eBay.";
export const metadata: Metadata = {
  title: "PriceRight: Etsy & eBay profit and pricing calculator",
  description: desc,
  openGraph: { title: "PriceRight: Know what you need to charge.", description: desc, type: "website" },
};
const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "PriceRight", applicationCategory: "BusinessApplication", description: desc, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="bg-slate-50 text-slate-900 antialiased">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />{children}<Analytics /></body></html>);
}
