import React from "react";
import Link from "next/link";

export default function Custom404() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-6 py-12 text-center animate-fadeIn">
      <div className="max-w-xs w-full flex flex-col gap-6">
        {/* Large Emoji */}
        <span className="text-[96px] leading-none select-none" role="img" aria-label="toilet">
          🚽
        </span>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            This page doesn&apos;t exist
          </h1>
          <p className="text-sm text-[#78716C] dark:text-stone-400 leading-relaxed">
            The toilet you&rsquo;re looking for has been flushed.
          </p>
        </div>

        {/* Home Button CTA */}
        <Link
          href="/"
          className="w-full h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl flex items-center justify-center shadow-button active:scale-[0.97] transition-all duration-150 text-sm mt-4"
        >
          Find Toilets Near Me
        </Link>
      </div>
    </div>
  );
}
