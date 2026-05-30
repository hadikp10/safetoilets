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
import { ArrowLeft, Plus } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useSupabase();
  const { latitude, longitude, getPosition } = useLocation();

  const [contributions, setContributions] = useState<Restroom[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
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
      className="min-h-screen bg-neutral-50 px-4 py-8 text-left"
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
            <span className="bg-brand-greenLight text-brand-greenText text-xs font-normal tracking-wide uppercase px-2 py-0.5 rounded-[14px] border border-brand-green/20">
              {contributions.length}
            </span>
          </div>
        </div>

        {/* Contributions List */}
        {contributions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 bg-white rounded-[20px] border border-neutral-200 shadow-card">
            <div className="w-10 h-10 border-[1.5px] border-neutral-200 rounded-xl flex items-center justify-center text-xl text-neutral-400 font-mono">
              ?
            </div>
            <h3 className="text-base font-medium text-neutral-900">
              You haven&apos;t added any toilets yet.
            </h3>
            <p className="text-sm text-neutral-600 text-center max-w-[220px] leading-relaxed">
              Add clean toilets near you to help the local Kerala community.
            </p>
            <Link href="/add" passHref legacyBehavior>
              <motion.a
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.08 }}
                className="bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium h-[52px] px-6 rounded-[14px] mt-2 flex items-center gap-1.5 shadow-button"
              >
                <Plus className="w-4 h-4" />
                Add your first toilet
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
            className="bg-white rounded-[20px] overflow-hidden border border-neutral-200 flex flex-col divide-y divide-neutral-200 shadow-card"
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
