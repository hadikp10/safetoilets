"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
      <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-brand-green" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-normal text-neutral-600">Verifying credentials & syncing session...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="max-w-md bg-white border border-neutral-200 p-8 rounded-[20px] shadow-card flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted border border-border flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-text-secondary" />
          </div>
          <h1 className="text-[20px] font-semibold text-neutral-900 mt-2">
            Login Callback Failed
          </h1>
          <p className="text-sm text-neutral-600 mt-2 text-center leading-relaxed">
            {errorMsg}
          </p>
          <div className="mt-6 flex flex-col gap-3 w-full">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={() => router.push("/login")}
              className="w-full h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] shadow-button flex items-center justify-center"
            >
              Return to Login
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={() => router.push("/")}
              className="w-full h-[52px] bg-transparent border border-neutral-200 text-neutral-900 hover:bg-neutral-50 text-[14px] font-medium rounded-[14px] flex items-center justify-center"
            >
              Go to Homepage
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
