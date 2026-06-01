"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSupabase } from "@/hooks/useSupabase";
import { AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const { loginWithGoogle, isAuthenticated, loading } = useSupabase();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setAuthTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const checkLoginRedirect = async () => {
      const statePayload = {
        source: "login_page",
        loading,
        isAuthenticated,
        savedPath: typeof window !== "undefined" ? sessionStorage.getItem("authRedirectPath") : null
      };

      console.log("[Diag Login Page] State check:", statePayload);

      if (!loading && isAuthenticated) {
        const savedPath = sessionStorage.getItem("authRedirectPath") || "/";
        console.log("[Diag Login Page] Redirecting to:", savedPath);
        try {
          await fetch("/api/diag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "login_redirect",
              destination: savedPath,
              state: statePayload
            })
          });
        } catch (e) {
          console.error("Failed to post diagnostics from login:", e);
        }
        sessionStorage.removeItem("authRedirectPath");
        router.replace(savedPath);
      }
    };

    checkLoginRedirect();
  }, [isAuthenticated, loading, router]);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Google OAuth error:", err);
      setAuthLoading(false);
    }
  };

  const isBtnDisabled = loading || authLoading;

  if (authTimeout && !authLoading) {
    return (
      <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto font-sans">
        <div className="w-12 h-12 text-text-secondary bg-surface-muted rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">Authentication Timeout</h3>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
          Retrieving your login status is taking longer than usual. Please check your connection or try signing in again.
        </p>
        <div className="flex flex-col gap-2 w-full mt-6">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => window.location.reload()}
            className="w-full h-[40px] bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium rounded-xl transition-colors shadow-button"
          >
            Retry Loading
          </motion.button>
          <Link href="/" className="w-full">
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="w-full h-[40px] bg-transparent border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-[13px] font-medium rounded-xl transition-colors"
            >
              Browse Without Account
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !authLoading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-surface-bg text-neutral-900 flex flex-col justify-start px-4 pt-20 pb-8"
    >
      <div className="w-full max-w-[320px] mx-auto flex flex-col items-stretch">
        
        {/* Title / Brand */}
        <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight text-left">
          SafeToilets
        </h1>
        
        {/* Subtext */}
        <p className="text-[14px] text-neutral-600 mt-1 mb-10 text-left">
          Find clean toilets near you.
        </p>

        {/* Google Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.08 }}
          onClick={handleGoogleLogin}
          disabled={isBtnDisabled}
          className="w-full h-[52px] rounded-[14px] bg-white border border-neutral-200 shadow-button flex items-center justify-center gap-3 px-4 hover:bg-neutral-50 active:scale-[0.99] transition-all disabled:opacity-70 disabled:pointer-events-none"
        >
          {authLoading ? (
            <svg className="animate-spin h-4 w-4 text-neutral-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          ) : (
            <>
              {/* Google G SVG */}
              <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-[14px] font-medium text-neutral-900">
                Continue with Google
              </span>
            </>
          )}
        </motion.button>

        {/* Legal Disclaimer */}
        <p className="text-[11px] text-neutral-400 text-center mt-6 leading-relaxed">
          By signing in you agree to help keep SafeToilets accurate and respectful.
        </p>

        {/* Cancel/Browse link */}
        <Link
          href="/"
          className="text-center text-xs font-medium text-neutral-600 hover:text-neutral-900 mt-8 transition-colors"
        >
          Cancel and return home
        </Link>
      </div>
    </motion.div>
  );
}
