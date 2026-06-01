"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSupabase } from "@/hooks/useSupabase";
import { useLocation } from "@/lib/hooks/useLocation";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import ToiletCard from "@/components/toilet/ToiletCard";
import { calculateDistance } from "@/lib/utils/distance";
import { ArrowLeft, Plus, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useSupabase();
  const { latitude, longitude, getPosition } = useLocation();

  const [contributions, setContributions] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading || loading) {
        setAuthTimeout(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [authLoading, loading]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

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
  }, [user, getPosition]);

  if (authTimeout) {
    return (
      <div className="min-h-screen bg-surface-bg flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto font-sans">
        <div className="w-12 h-12 text-text-secondary bg-surface-muted rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-text-secondary" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900">Authentication Timeout</h3>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
          Retrieving your profile data is taking longer than usual. Please check your connection or try signing in again.
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-brand-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  const userCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-surface-bg px-4 py-8 text-left"
    >
      <div className="max-w-md mx-auto flex flex-col gap-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
          <Link href="/" passHref legacyBehavior>
            <motion.a
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              className="w-8 h-8 rounded-[14px] bg-white border border-neutral-200 flex items-center justify-center shadow-button text-neutral-900 hover:bg-neutral-50 transition-colors"
              aria-label="Go back to Home"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </motion.a>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-neutral-900 tracking-tight">
              Your contributions
            </h1>
            <span className="bg-brand-greenLight text-brand-greenDark text-xs font-normal tracking-wide uppercase px-2 py-0.5 rounded-[14px] border border-brand-green/20">
              {contributions.length}
            </span>
          </div>
        </div>

        {/* Contributions List */}
        {contributions.length === 0 ? (
          <div className="py-12 px-6 bg-white rounded-2xl border border-surface-border text-center flex flex-col items-center gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.01),0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="w-12 h-12 bg-neutral-50 rounded-full border border-neutral-100 flex items-center justify-center text-lg shadow-sm">
              ✨
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text-primary">No contributions yet</h3>
              <p className="text-xs text-text-secondary max-w-[240px] leading-relaxed mx-auto">
                Help other travelers by adding public toilets you visit. Every entry makes a difference.
              </p>
            </div>
            <Link href="/add" passHref legacyBehavior>
              <motion.a
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first restroom</span>
              </motion.a>
            </Link>
          </div>
        ) : (
          <motion.div
            variants={{
              show: { transition: { staggerChildren: 0.055 } }
            }}
            initial="hidden"
            animate="show"
            className="space-y-3.5 flex flex-col"
          >
            {contributions.map((restroom) => {
              const distance = userCoords
                ? calculateDistance(
                    userCoords.latitude,
                    userCoords.longitude,
                    restroom.latitude,
                    restroom.longitude
                  )
                : null;
              return (
                <ToiletCard
                  key={restroom.id}
                  toilet={restroom}
                  distance={distance}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
