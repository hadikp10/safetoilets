"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const { loginWithGoogle, isAuthenticated, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const savedPath = sessionStorage.getItem("authRedirectPath") || "/";
      sessionStorage.removeItem("authRedirectPath");
      router.replace(savedPath);
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-green border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col text-center">
        {/* Brand Marker */}
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-brand-green text-text-inverse rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-md">
            ST
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-text-inverse leading-snug">
          SafeToilets
        </h1>
        <p className="text-xs text-text-secondary font-medium mt-1">
          Crowdsourced clean toilet locator for Kerala, India
        </p>

        {/* Login Button Card */}
        <div className="mt-8 bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <p className="text-xs text-text-secondary font-semibold mb-4 leading-relaxed">
            You must log in to register new toilets or verify details.
          </p>

          <Button
            onClick={loginWithGoogle}
            disabled={loading}
            variant="primary"
            fullWidth
            className="h-12 text-xs flex items-center justify-center gap-3"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.52 4.114-5.127 4.114a5.955 5.955 0 0 1-5.96-5.96 5.955 5.955 0 0 1 5.96-5.96c2.323 0 4.148 1.488 4.908 3.518l3.96-2.3C20.61 3.565 16.7 1 12 1 5.925 1 1 5.925 1 12s4.925 11 11 11c5.8 0 10.825-4.145 10.825-11 0-.69-.065-1.39-.185-2.015H12.24z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </div>

        {/* Back Link */}
        <Link
          href="/"
          className="text-text-secondary hover:text-text-primary dark:hover:text-text-inverse text-xs font-semibold mt-6 transition-colors min-h-[44px] flex items-center justify-center"
        >
          Browse toilets without logging in
        </Link>
      </div>
    </div>
  );
}
