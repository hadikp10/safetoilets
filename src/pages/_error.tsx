import React from "react";
import { NextPageContext } from "next";
import Link from "next/link";

interface ErrorProps {
  statusCode?: number;
}

export default function Error({ statusCode }: ErrorProps) {
  // Log the error to console
  React.useEffect(() => {
    console.error(`Next.js runtime error. Status code: ${statusCode}`);
  }, [statusCode]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-6 py-12 text-center animate-fadeIn">
      <div className="max-w-xs w-full flex flex-col gap-6">
        {/* Warning Icon */}
        <span className="text-[96px] leading-none select-none" role="img" aria-label="warning">
          ⚠️
        </span>

        {/* Text */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            Something went wrong
          </h1>
          <p className="text-sm text-[#78716C] dark:text-stone-400 leading-relaxed">
            Try refreshing the page.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl flex items-center justify-center shadow-button active:scale-[0.97] transition-all duration-150 text-sm"
          >
            Refresh
          </button>
          <Link
            href="/"
            className="w-full h-[52px] border-[1.5px] border-[#16A34A] text-[#16A34A] font-semibold rounded-2xl flex items-center justify-center hover:bg-[#DCFCE7] active:scale-[0.97] transition-all duration-150 text-sm"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
