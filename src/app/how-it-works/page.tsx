import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - SafeToilets Platform",
  description: "Learn how SafeToilets utilizes device geolocation, crowdsourced verifications, photo security metadata stripping, and admin moderation to find public toilets.",
  alternates: {
    canonical: "https://safetoilets.in/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">How It Works</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          How SafeToilets Works
        </h1>
        <p className="text-sm text-neutral-600">
          A step-by-step breakdown of how our crowdsourced toilet finder platform operates.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <div className="space-y-6">
          {[
            {
              step: "1. Device Geolocation",
              text: "When you open the homepage, SafeToilets requests location access. This allows us to calculate nearby restrooms relative to your current coordinates. If denied, the platform defaults to displaying restrooms centered around the map viewport.",
            },
            {
              step: "2. Cleanliness Filters",
              text: "Use the filter bar on our homepage to sort public restrooms by overall cleanliness score, women's safety score, wheelchair accessibility, or 24-hour operation categories. Restrooms are rendered on a lightweight map with color-coded markers.",
            },
            {
              step: "3. Verify & Rate",
              text: "Restroom hygiene conditions change. SafeToilets allows users to submit live 'verification' reports. You can review a toilet's smell, water supply, lighting, and presence of soap or mirrors, which dynamically recalculates the restroom's overall score.",
            },
            {
              step: "4. Anonymized Photo Uploads",
              text: "Users can upload a photo when verifying a toilet. Before uploading to our secure storage buckets, the app strips EXIF metadata (such as device tags and original photo GPS coordinates) via local canvas processing to protect user privacy.",
            },
            {
              step: "5. Moderation & Reporting",
              text: "If a restroom listing is incorrect, permanently closed, or contains spam images, users can flag it. Reports are logged in our moderation system where administrators can edit, hide, or delete restrooms and ban abusive profiles.",
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-neutral-200 rounded-[20px] p-5 shadow-card">
              <h3 className="text-base font-semibold text-neutral-900 mb-2">{item.step}</h3>
              <p className="text-xs md:text-sm text-neutral-600">{item.text}</p>
            </div>
          ))}
        </div>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/ratings" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          Ratings Guidelines
        </Link>
      </footer>
    </div>
  );
}
