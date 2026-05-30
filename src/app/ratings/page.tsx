import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ratings Guidelines - SafeToilets Scoring",
  description: "Learn how overall restroom scores and specific metrics like cleanliness, safety, water, and smell levels are calculated on SafeToilets.",
  alternates: {
    canonical: "https://safetoilets.in/ratings",
  },
};

export default function RatingsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">Ratings</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          Scoring & Ratings Guidelines
        </h1>
        <p className="text-sm text-neutral-600">
          How ratings are defined and how we calculate a toilet&apos;s overall score.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <p>
          Restrooms listed on SafeToilets display individual category star ratings alongside a cached overall score out of 5 stars. 
          Verifying a toilet allows you to score these categories based on clear, standardized guidelines:
        </p>

        <div className="space-y-4 pt-2">
          {[
            {
              title: "Cleanliness",
              desc: "Measures general hygiene. Rate 5 if floors, pans, and washbasins are fully spotless and dry. Rate 1 if waste bins are overflowing, feces or dirt are present, or basins are unusable.",
            },
            {
              title: "Smell Level",
              desc: "Odor intensity checks. Rate 5 for a completely neutral or clean smell. Rate 1 if strong sewage or urine odor prevents comfortable use.",
            },
            {
              title: "Lighting Conditions",
              desc: "Electrical fixtures visibility. Rate 5 for working bright tubelights/bulbs, secure wiring, and high visibility. Rate 1 if there is zero lighting, broken bulbs, or pitch darkness.",
            },
            {
              title: "Women Safety",
              desc: "Privacy and structural safety. Rate 5 for secure internal locks, well-divided gender access sections, private ventilation window grills, and safe surroundings. Rate 1 if locks are broken, doors have gaps, or privacy is compromised.",
            },
            {
              title: "Water Availability",
              desc: "Running water utility. Rate 5 if taps, flushes, and health faucets have high-pressure continuous running water. Rate 1 if dry taps, broken flushes, or zero water supply exists.",
            },
          ].map((item, idx) => (
            <div key={idx} className="border-b border-neutral-200 pb-4 last:border-none">
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">{item.title}</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-semibold text-neutral-900 pt-6">How Overall Score is Calculated</h2>
        <p>
          A restroom&apos;s overall rating score is calculated using a weighted average of individual verification ratings, 
          prioritizing cleanliness, smell, and water availability:
        </p>
        <p className="font-mono text-xs bg-neutral-100 p-3 rounded-[10px] text-neutral-900 border border-neutral-200">
          Overall Score = (Cleanliness × 0.40) + (Smell × 0.30) + (Water × 0.15) + (Safety × 0.10) + (Lighting × 0.05)
        </p>
        <p>
          Calculations are managed directly at the database layer using triggered aggregation routines to ensure maximum performance 
          and immediate listings synchronization.
        </p>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/reviews" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          Reviews Policy
        </Link>
      </footer>
    </div>
  );
}
