"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-[#2F9E44]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      </div>
    );
  }

  const userCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-white px-4 py-8 animate-fadeIn text-left">
      <div className="max-w-md mx-auto flex flex-col gap-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center gap-4 border-b border-[#E9E9E7] pb-4">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-white border border-[#E9E9E7] flex items-center justify-center shadow-button text-[#191919] hover:bg-[#EFEEEB] transition-colors"
            aria-label="Go back to Home"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[#191919] tracking-tight">
              Your contributions
            </h1>
            <span className="bg-[#EBFBEE] text-[#1E6E2E] text-xs font-semibold px-2 py-0.5 rounded-md">
              {contributions.length}
            </span>
          </div>
        </div>

        {/* Contributions List */}
        {contributions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 bg-white">
            <div className="w-10 h-10 border-[1.5px] border-[#D3D3CF] rounded-xl flex items-center justify-center text-xl text-[#999999] font-mono">
              ?
            </div>
            <h3 className="text-base font-medium text-[#191919]">
              You haven&apos;t added any toilets yet.
            </h3>
            <p className="text-sm text-[#6B6B6B] text-center max-w-[220px] leading-relaxed">
              Add clean toilets near you to help the local Kerala community.
            </p>
            <Link
              href="/add"
              className="bg-[#191919] hover:bg-[#2F9E44] text-white text-[13px] font-medium px-4 py-2 rounded-lg mt-2 transition-colors active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add your first toilet
            </Link>
          </div>
        ) : (
          <div className="bg-[#F7F7F5] rounded-2xl overflow-hidden border border-[#E9E9E7] flex flex-col divide-y divide-[#E9E9E7]">
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
          </div>
        )}
      </div>
    </div>
  );
}
