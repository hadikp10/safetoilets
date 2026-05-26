import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console, never display raw details in user interface
    console.error("Uncaught page render error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-6 py-12 text-center animate-fadeIn">
          <div className="max-w-xs w-full flex flex-col gap-6">
            {/* Warning Icon or simple graphic */}
            <span className="text-[96px] leading-none select-none" role="img" aria-label="warning">
              ⚠️
            </span>

            {/* Content Text */}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
                Something went wrong
              </h1>
              <p className="text-sm text-[#78716C] dark:text-stone-400 leading-relaxed">
                Try refreshing the page.
              </p>
            </div>

            {/* CTA Buttons */}
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

    return this.props.children;
  }
}
