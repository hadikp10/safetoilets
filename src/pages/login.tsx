import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";

export default function LoginPage() {
  const { loginWithGoogle, isAuthenticated, loading } = useSupabase();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-4 animate-fadeIn">
      <div className="w-full max-w-sm flex flex-col text-center">
        {/* SafeToilets Logo */}
        <div className="text-4xl font-extrabold text-brand-green tracking-tight select-none mb-2">
          SafeToilets
        </div>

        {/* Tagline */}
        <p className="text-sm text-[#78716C] dark:text-stone-400 mb-8 font-medium">
          Help Kerala find clean toilets
        </p>

        {/* Login Card */}
        <div className="bg-white dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-850 rounded-3xl p-6 shadow-card text-left flex flex-col gap-4">
          <p className="text-xs text-text-secondary dark:text-stone-450 font-bold text-center leading-relaxed">
            You must log in to register new toilets or verify details.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isBtnDisabled}
            className="w-full h-[52px] bg-white text-stone-700 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-750 border border-[#E7E5E4] dark:border-stone-700 font-semibold rounded-2xl text-sm flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-button relative overflow-hidden"
          >
            {authLoading ? (
              <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
            ) : (
              <>
                {/* Google "G" SVG icon */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
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
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="text-[10px] text-[#A8A29E] text-center mt-1 leading-normal">
            By continuing you agree to our community guidelines.
          </div>
        </div>

        {/* Back Link */}
        <Link
          href="/"
          className="text-text-secondary hover:text-text-primary text-xs font-semibold mt-6 transition-colors"
        >
          Browse toilets without logging in
        </Link>
      </div>
    </div>
  );
}
