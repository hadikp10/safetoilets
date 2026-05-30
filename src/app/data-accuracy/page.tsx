import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Accuracy Policy - SafeToilets Integrity",
  description: "Read our Data Accuracy Policy to understand geographic boundaries, duplicate restroom listing prevention, metadata stripping, and rate limiting validation.",
  alternates: {
    canonical: "https://safetoilets.in/data-accuracy",
  },
};

export default function DataAccuracyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">Data Accuracy</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          Data Accuracy Policy
        </h1>
        <p className="text-sm text-neutral-600">
          How SafeToilets maintains a clean, verified, and accurate database of public restrooms.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <p>
          SafeToilets is committed to listing only high-quality, verified public restroom data. 
          To prevent coordinate drifting, spam entries, or duplicate records, we enforce several automated safeguards:
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">1. Geographic Boundary Checks</h2>
        <p>
          To maintain regional focus, submissions must fall within our designated operating borders (currently bounded to Kerala, India). 
          Any coordinate pair submitted outside this bounding box is automatically rejected.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">2. Duplicate Restroom Prevention</h2>
        <p>
          When adding a restroom, our database verifies other listings within a 50-meter radius using the Haversine distance formula. 
          If a match is found, the user is warned to review the existing location on the map, preventing double listings of the same toilet.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">3. Periodic Re-Verification</h2>
        <p>
          Hygiene conditions change over time. If a restroom has not been verified for over 48 hours, its status shifts to &apos;Needs verification&apos; 
          on the details page, prompting local community members to submit fresh updates.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">4. Anti-Spam Write Limits</h2>
        <p>
          To prevent malicious accounts from skewing data quality, new restrooms are restricted to 3 per day per contributor. 
          Verifications are limited to 1 every 5 minutes per toilet, ensuring real-world logs match user check-ins.
        </p>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/community-guidelines" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          Community Guidelines
        </Link>
      </footer>
    </div>
  );
}
