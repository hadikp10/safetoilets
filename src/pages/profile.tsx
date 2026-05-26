import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSupabase } from "@/hooks/useSupabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import RestroomCard from "@/components/Restroom/RestroomCard";
import { ArrowLeft, Plus } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useSupabase();
  const { latitude, longitude, getPosition } = useGeolocation();

  const [contributions, setContributions] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading]);

  const fetchContributions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("restrooms")
        .select("*")
        .eq("created_by", userId);
      
      if (error) throw error;
      setContributions(data as Restroom[]);
    } catch (err) {
      console.error("Error loading contributions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContributions(user.id);
      getPosition();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  const userCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 px-4 py-8 animate-fadeIn">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        {/* Navigation / Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shadow-sm text-text-primary hover:text-stone-900 dark:hover:text-white transition-all active:scale-95"
            aria-label="Go back to Home"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
              Your contributions
            </h1>
            <span className="bg-[#DCFCE7] text-[#15803D] dark:bg-[#15803D]/25 dark:text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
              {contributions.length}
            </span>
          </div>
        </div>

        {/* Contributions List */}
        {contributions.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-850 rounded-3xl p-8 text-center shadow-card flex flex-col gap-4 items-center">
            <span className="text-5xl select-none" role="img" aria-label="toilet">🚽</span>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">
                You haven&apos;t added any toilets yet.
              </h3>
              <p className="text-xs text-text-secondary dark:text-stone-400 max-w-[240px] leading-relaxed">
                Add clean toilets near you to help the local Kerala community.
              </p>
            </div>
            <Link
              href="/?add=true"
              className="w-full max-w-xs h-[52px] bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-button active:scale-[0.97] transition-all duration-150 text-sm mt-2"
            >
              <Plus className="w-4 h-4" />
              Add your first toilet
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {contributions.map((restroom) => (
              <RestroomCard
                key={restroom.id}
                restroom={restroom}
                userCoords={userCoords}
                onSelect={(r) => router.push(`/toilet/${r.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
