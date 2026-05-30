import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Guidelines - SafeToilets Platform",
  description: "Read our community guidelines and code of conduct to understand your responsibilities as a contributor to SafeToilets.",
  alternates: {
    canonical: "https://safetoilets.in/community-guidelines",
  },
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">Community Guidelines</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          Community Guidelines
        </h1>
        <p className="text-sm text-neutral-600">
          Rules of engagement for building a safe and reliable public hygiene index.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <p>
          SafeToilets is built on mutual respect and shared public responsibility. 
          By contributing to our platform, you agree to adhere to these guidelines:
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">1. Honest & Accurate Submissions</h2>
        <p>
          Only add restrooms that you have physically visited or confirmed. Ensure GPS coordinates are mapped accurately on the search viewport. 
          Do not overestimate or underestimate rating scores (cleanliness, women safety) to bias a toilet&apos;s score.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">2. Clean Photo Contributions</h2>
        <p>
          Uploaded photos should show the physical entrance, toilets, washbasins, or signage of the restroom listing. 
          Do not upload selfies, pictures of people, commercial advertisements, or offensive images. 
          Photos violating these parameters are purged, and contributors will be banned.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">3. Respect User Safety</h2>
        <p>
          SafeToilets is a civic utility. Avoid using gender-restrictive language, discrimination, or abusive flags. 
          Ensure safe access check-ins (e.g. wheelchair validation, female safety locks verification) are conducted carefully.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">4. Compliance & Moderation</h2>
        <p>
          Our administration team has complete auditing control. Account suspensions are permanent for spammers, troll listings creators, 
          or users attempting to bypass rate limits.
        </p>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/about" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          About SafeToilets
        </Link>
      </footer>
    </div>
  );
}
