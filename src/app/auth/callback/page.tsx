"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        // If there's already a session, just redirect
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const savedPath = sessionStorage.getItem("authRedirectPath") || "/";
          sessionStorage.removeItem("authRedirectPath");
          router.push(savedPath);
        } else {
          setErrorMsg("No authorization code was found in the URL.");
          setLoading(false);
        }
        return;
      }

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        const savedPath = sessionStorage.getItem("authRedirectPath") || "/";
        sessionStorage.removeItem("authRedirectPath");
        
        router.push(savedPath);
      } catch (err) {
        console.error("Auth callback exchange error:", err);
        const error = err as Error;
        setErrorMsg(error.message || "Failed to exchange auth code for session. The code may be expired or already used.");
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-brand-green" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold text-text-secondary">Verifying credentials & syncing session...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-surface-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border p-8 rounded-2xl shadow-sm">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-xl font-bold text-text-primary dark:text-text-inverse mt-4">
            Login Callback Failed
          </h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {errorMsg}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push("/login")} variant="primary" fullWidth>
              Return to Login
            </Button>
            <Button onClick={() => router.push("/")} variant="ghost" fullWidth>
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
