import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSupabase } from "@/hooks/useSupabase";
import AdminDashboard from "@/components/Admin/AdminDashboard";

export default function AdminPage() {
  const { profile, loading, isAuthenticated, isAdmin } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    // If auth state loaded and user is NOT admin, send back to home
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/");
      }
    }
  }, [loading, isAuthenticated, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-black dark:text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-bold text-stone-500 tracking-widest uppercase">Checking Access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin || !profile) {
    return null; // redirecting
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50">
      <AdminDashboard currentProfile={profile} />
    </div>
  );
}
