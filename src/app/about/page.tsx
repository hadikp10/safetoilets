import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About SafeToilets - Crowdsourced Public Restroom Finder",
  description: "Learn about SafeToilets, our mission to make public sanitation discoverable, accessible, and clean, and how our community crowdsources restroom verification.",
  alternates: {
    canonical: "https://safetoilets.in/about",
  },
};

export default function AboutPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "mainEntity": {
      "@type": "Organization",
      "name": "SafeToilets",
      "url": "https://safetoilets.in",
      "logo": "https://safetoilets.in/icons/icon-512.png",
      "description": "SafeToilets is a public toilet discovery platform helping users find clean, safe, and accessible restrooms through crowdsourced verifications.",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
        {/* Breadcrumb Navigation */}
        <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
          <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
          <span>&gt;</span>
          <span className="text-neutral-600">About</span>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
            About SafeToilets
          </h1>
          <p className="text-sm text-neutral-600">
            Learn about our mission to democratize clean and safe public hygiene.
          </p>
        </header>

        {/* Content */}
        <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
          <p>
            Public sanitation is one of the most critical yet neglected infrastructure components in modern cities. 
            Finding a clean, functioning, and safe toilet on the go is a daily challenge for millions, particularly 
            for women, elderly people, travelers, and those with specific accessibility needs.
          </p>

          <h2 className="text-base font-semibold text-neutral-900 pt-4">Our Mission</h2>
          <p>
            <strong>SafeToilets</strong> was built to solve this problem by leveraging community crowdsourcing and open geographical tools. 
            We provide a transparent, user-curated database of public restrooms, rating them on five key hygiene metrics: cleanliness, 
            smell level, lighting conditions, water availability, and safety indicators.
          </p>

          <h2 className="text-base font-semibold text-neutral-900 pt-4">Platform Values</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Transparency:</strong> Our ratings are computed entirely from community-submitted reviews and live verifications.
            </li>
            <li>
              <strong>Privacy First:</strong> Contributors can verify toilets and upload photos anonymously. We strip camera metadata and EXIF location tags before saving uploads.
            </li>
            <li>
              <strong>Anti-Spam & Integrity:</strong> We employ database level security triggers, distance checks, and rate limits to prevent fake listings and spam.
            </li>
            <li>
              <strong>Open Data:</strong> SafeToilets integrates maps via OpenStreetMap, respecting user choice and open-source data standards.
            </li>
          </ul>

          <h2 className="text-base font-semibold text-neutral-900 pt-4">Future Vision</h2>
          <p>
            While our initial launch focuses on Kerala, SafeToilets is designed with a scalable database and routing architecture 
            ready for national expansion. By mapping every public toilet, we aim to encourage local administrations to maintain 
            better civic sanitation facilities.
          </p>
        </article>

        {/* Footer actions */}
        <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
          <Link href="/">
            <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
              Find Toilets Near Me
            </button>
          </Link>
          <Link href="/faq" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
            Read FAQs
          </Link>
        </footer>
      </div>
    </>
  );
}
