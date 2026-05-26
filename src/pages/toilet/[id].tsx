import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSupabase } from "@/hooks/useSupabase";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/lib/supabase";
import { Restroom } from "@/types";
import RestroomDetail from "@/components/Restroom/RestroomDetail";
import SkeletonDetail from "@/components/Restroom/SkeletonDetail";
import ReportForm from "@/components/Restroom/ReportForm";

export default function ToiletDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useSupabase();
  const { latitude, longitude, getPosition } = useGeolocation();

  const [restroom, setRestroom] = useState<Restroom | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showReportForm, setShowReportForm] = useState(false);

  const fetchRestroom = async (restroomId: string) => {
    try {
      const { data, error } = await supabase
        .from("restrooms")
        .select("*")
        .eq("id", restroomId)
        .single();
      
      if (error) throw error;
      setRestroom(data as Restroom);
    } catch (err) {
      console.error("Error fetching restroom details:", err);
      router.push("/404");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRestroom(id as string);
      getPosition();
    }
  }, [id]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-8">
        <div className="max-w-md mx-auto bg-white dark:bg-stone-900 rounded-3xl overflow-hidden shadow-card border border-stone-200 dark:border-stone-800">
          <SkeletonDetail />
        </div>
      </div>
    );
  }

  if (!restroom) return null;

  const userCoords = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-4 xs:py-8 animate-fadeIn">
      <div className="max-w-md mx-auto bg-white dark:bg-stone-900 rounded-3xl overflow-hidden shadow-card border border-stone-200 dark:border-stone-800 relative">
        <RestroomDetail
          restroom={restroom}
          userCoords={userCoords}
          onClose={() => router.push("/")}
          onVerify={() => router.push(`/verify/${restroom.id}`)}
          onReport={() => setShowReportForm(true)}
          isAuthenticated={isAuthenticated}
          onLoginPrompt={() => router.push("/login")}
        />
      </div>

      {/* Report Form Overlay */}
      {showReportForm && (
        <ReportForm
          restroom={restroom}
          userId={user?.id || null}
          onClose={() => setShowReportForm(false)}
          onSuccess={() => {
            setShowReportForm(false);
            alert("Thank you. Your report has been submitted for admin review.");
          }}
        />
      )}
    </div>
  );
}
