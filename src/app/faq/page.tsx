import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions - SafeToilets FAQ",
  description: "Get answers to common questions about finding clean public restrooms, reporting dirty toilets, submitting reviews, and privacy rules on SafeToilets.",
  alternates: {
    canonical: "https://safetoilets.in/faq",
  },
};

export default function FAQPage() {
  const faqs = [
    {
      q: "Where can I find a public toilet near me?",
      a: "SafeToilets uses your device's GPS coordinates to display nearby restrooms on the map. Simply allow location access when prompted on our homepage, and the nearest toilets will be displayed in order of proximity.",
    },
    {
      q: "How do I find clean toilets nearby?",
      a: "Restrooms are ranked by their overall rating score, which is calculated based on cleanliness, smell, and water availability. You can also use our 'Clean' filter button to show only restrooms with cleanliness scores above 3.8 stars.",
    },
    {
      q: "Are public toilets free?",
      a: "Public toilets listed on SafeToilets can be free (municipal toilets) or pay-per-use. We catalog toilet types like Restaurants, Petrol Pumps, Malls, and Railway stations, which may have their own usage guidelines.",
    },
    {
      q: "How can I report a dirty or broken toilet?",
      a: "If a restroom is dirty, lacks water, or is closed, you can tap on its listing detail view and select 'Verify / Update' to submit a fresh verification report. If the toilet is permanently closed, fake, or has incorrect coordinates, tap 'Report an issue' to notify site administrators.",
    },
    {
      q: "How do ratings work on SafeToilets?",
      a: "Toilets are rated on five criteria: cleanliness, smell level, lighting conditions, safety for women, and water availability. An overall score (out of 5.0) is calculated by weighting cleanliness, smell, and water availability, which is cached for performance.",
    },
    {
      q: "How reliable are the reviews?",
      a: "SafeToilets uses crowdsourced verifications from verified users. We enforce strict database triggers to rate-limit reviews (max 1 per 5 minutes per toilet, max 20 per day per user) to prevent review manipulation and spam.",
    },
    {
      q: "How can I add a toilet location?",
      a: "You can click on the 'Add Toilet' button in the navigation bar. SafeToilets will detect your GPS coordinates to automatically suggest a location. You will need to specify the toilet type, facility details, and submit an initial verification form.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
        {/* Breadcrumbs */}
        <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
          <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
          <span>&gt;</span>
          <span className="text-neutral-600">FAQ</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-neutral-600">
            Find answers to commonly asked questions about SafeToilets.
          </p>
        </header>

        {/* Q&A Accordion Layout */}
        <section className="space-y-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white border border-neutral-200 rounded-[20px] p-5 shadow-card transition"
            >
              <h3 className="text-sm font-semibold text-neutral-900 mb-2 leading-snug">
                {faq.q}
              </h3>
              <p className="text-xs md:text-sm text-neutral-600 leading-relaxed font-normal">
                {faq.a}
              </p>
            </div>
          ))}
        </section>

        {/* Footer actions */}
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
    </>
  );
}
