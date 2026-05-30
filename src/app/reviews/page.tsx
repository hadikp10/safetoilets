import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reviews Guidelines - SafeToilets Verification",
  description: "Understand our review policy, verification steps, anti-spam mechanisms, and how community verifications maintain database accuracy on SafeToilets.",
  alternates: {
    canonical: "https://safetoilets.in/reviews",
  },
};

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">Reviews</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          Review & Verification Guidelines
        </h1>
        <p className="text-sm text-neutral-600">
          How user verifications keep SafeToilets accurate and spam-free.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <p>
          SafeToilets does not use traditional free-text comments or unverified reviews. 
          Instead, we rely on **Verifications**—structured reports from community members who physically visit a toilet.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">Who Can Verify?</h2>
        <p>
          Any user logged in via Google Authentication can submit a verification. 
          Authentication is required to ensure accountability, allow profile tracing, and prevent bot-driven spam listings.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">Verification Structure</h2>
        <p>
          Each verification must include:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Star Ratings:</strong> Cleanliness, smell, water, safety, and lighting (from 1 to 5 stars).</li>
          <li><strong>Facilities Checklist:</strong> Dynamic validation of whether soap, mirrors, or sanitary disposal bins are physically present.</li>
          <li><strong>Photo Proof (Optional):</strong> A recent picture showing current restroom status.</li>
        </ul>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">Anti-Spam Protections</h2>
        <p>
          To maintain data integrity, the system implements:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Rate Limits:</strong> A single user profile is restricted to 1 verification per 5 minutes per toilet, and a maximum of 20 verifications in any 24-hour period.</li>
          <li><strong>Banning:</strong> User profiles found uploading malicious images, fake ratings, or spam will be banned by site administrators, automatically invalidating their past verifications.</li>
        </ul>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/reporting" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          Reporting Guidelines
        </Link>
      </footer>
    </div>
  );
}
