import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, isAuthenticated, loading } = useSupabase();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setAuthLoading(false);
    
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }
    if (isSignUp && !fullName) {
      setErrorMsg("Please enter your name.");
      return;
    }

    setAuthLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, fullName);
      } else {
        await loginWithEmail(email, password);
      }
      router.push("/");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Authentication failed. Please verify your credentials.";
      setErrorMsg(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const isBtnDisabled = loading || authLoading;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col text-center">
        {/* Brand Marker */}
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 bg-black text-white dark:bg-white dark:text-black rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-md">
            ST
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-50">
          SafeToilets
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold mt-1">
          Crowdsourced clean toilet locator for Kerala, India
        </p>

        {/* Login Button Card */}
        <div className="mt-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-2xl p-6 shadow-sm text-left">
          <p className="text-xs text-stone-600 dark:text-stone-400 font-bold mb-4 text-center">
            You must log in to register new toilets or verify details.
          </p>

          {errorMsg && (
            <div className="mb-4 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3 text-center">
              {errorMsg}
            </div>
          )}

          <button
            onClick={loginWithGoogle}
            disabled={isBtnDisabled}
            className="w-full h-12 bg-black text-white dark:bg-white dark:text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-sm"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.52 4.114-5.127 4.114a5.955 5.955 0 0 1-5.96-5.96 5.955 5.955 0 0 1 5.96-5.96c2.323 0 4.148 1.488 4.908 3.518l3.96-2.3C20.61 3.565 16.7 1 12 1 5.925 1 12s4.925 11 11 11c5.8 0 10.825-4.145 10.825-11 0-.69-.065-1.39-.185-2.015H12.24z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-200 dark:border-stone-800" />
            </div>
            <div className="relative flex justify-center text-2xs font-bold uppercase">
              <span className="bg-white dark:bg-stone-900 px-2.5 text-stone-400 dark:text-stone-500">
                Or use email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 text-xs font-semibold placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 text-xs font-semibold placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 text-xs font-semibold placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isBtnDisabled}
              className="w-full h-11 mt-2 bg-stone-900 text-white dark:bg-stone-100 dark:text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-[0.98] transition-transform shadow-sm"
            >
              {authLoading ? (
                <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Toggle link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 text-xs font-semibold transition-colors"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </button>
          </div>
        </div>

        {/* Back Link */}
        <Link
          href="/"
          className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-400 text-xs font-semibold mt-6 transition-colors"
        >
          Browse toilets without logging in
        </Link>
      </div>
    </div>
  );
}
