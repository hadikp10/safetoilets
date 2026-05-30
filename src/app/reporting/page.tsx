import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reporting Guidelines - SafeToilets Flagging",
  description: "Learn how to report incorrect restroom details, permanent closures, spam content, or duplicate listings on SafeToilets, and how moderators process flags.",
  alternates: {
    canonical: "https://safetoilets.in/reporting",
  },
};

export default function ReportingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans w-full max-w-2xl mx-auto px-4 py-8 flex flex-col text-left">
      <nav className="text-xs text-neutral-400 mb-6 flex gap-1.5 items-center">
        <Link href="/" className="hover:text-neutral-600 transition">Home</Link>
        <span>&gt;</span>
        <span className="text-neutral-600">Reporting</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
          Restroom Reporting Guidelines
        </h1>
        <p className="text-sm text-neutral-600">
          How to report issues, correct details, or flag spam on SafeToilets.
        </p>
      </header>

      <article className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed text-neutral-600">
        <p>
          Restrooms listed on SafeToilets rely on real-world accuracy. If you notice incorrect information, you can flag it directly 
          through our reporting interface.
        </p>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">Reasons to Report</h2>
        <p>
          You can submit a report flag for any of the following reasons:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Wrong Image:</strong> The cover photo is blurry, unrelated, offensive, or displays an incorrect restroom.</li>
          <li><strong>Fake Restroom:</strong> The toilet listing does not physically exist or is an intentional spam marker.</li>
          <li><strong>Closed Restroom:</strong> The restroom is permanently closed, locked, or demolished.</li>
          <li><strong>Incorrect Information:</strong> The toilet type, gender access, accessibility state, or coordinates are incorrect.</li>
        </ul>

        <h2 className="text-base font-semibold text-neutral-900 pt-4">Moderation Action Flow</h2>
        <p>
          Once a report is submitted, the listing undergoes moderator review:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>The report status is marked as <strong>Pending</strong> in the administrative dashboard.</li>
          <li>Site administrators review the flag reason and compare it with recent verifications.</li>
          <li>If valid, the admin executes moderation: hides the toilet listing, purges incorrect images, redirects coordinates, or resolves the report.</li>
          <li>Abusive contributors submitting false toilets or fake reports are banned permanently.</li>
        </ol>
      </article>

      <footer className="mt-12 pt-6 border-t border-neutral-200 flex justify-between items-center">
        <Link href="/">
          <button className="h-[48px] px-6 rounded-[14px] bg-brand-green hover:bg-brand-greenDark text-white font-medium text-[13px] shadow-button transition-colors">
            Find Toilets Near Me
          </button>
        </Link>
        <Link href="/data-accuracy" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline">
          Data Accuracy Policy
        </Link>
      </footer>
    </div>
  );
}
