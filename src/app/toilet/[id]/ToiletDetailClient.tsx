"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useToiletDetail } from "@/lib/hooks/useToiletDetail";
import { useSupabase } from "@/hooks/useSupabase";
import { useToast } from "@/context/ToastContext";
import BottomSheet from "@/components/ui/BottomSheet";
import { Navigation, Star, Camera } from "lucide-react";
import { Restroom } from "@/types";

// Dynamic map view for Leaflet SSR safety
const MapView = dynamic(() => import("@/components/Map/MapView"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-[20px] bg-neutral-100 skeleton" />,
});

interface ToiletDetailClientProps {
  initialToilet: Restroom;
  id: string;
}

export default function ToiletDetailClient({ initialToilet, id }: ToiletDetailClientProps) {
  const router = useRouter();
  const { isAuthenticated, loginWithGoogle } = useSupabase();
  const { showToast } = useToast();
  const { toilet, isLoading, error } = useToiletDetail(id, initialToilet);

  // States
  const [imgError, setImgError] = useState(false);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState<string>("wrong_image");
  const [reportLoading, setReportLoading] = useState(false);

  // OS Native Maps Deep Linking
  const handleGetDirections = () => {
    if (!toilet) return;
    const lat = toilet.latitude;
    const lng = toilet.longitude;
    
    let isAppleDevice = false;
    if (typeof window !== "undefined") {
      isAppleDevice =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    const daddr = `${lat},${lng}`;
    const url = isAppleDevice
      ? `maps://maps.apple.com/?daddr=${daddr}`
      : `https://www.google.com/maps/dir/?api=1&destination=${daddr}`;
    
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    if (!toilet) return;
    const shareData = {
      title: `${toilet.name} | SafeToilets`,
      text: `Find public restroom "${toilet.name}" at ${toilet.location_name}.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard!", "success");
      } catch {
        showToast("Failed to copy link.", "error");
      }
    }
  };

  // Verify/Update Click Action
  const handleVerifyClick = () => {
    if (isAuthenticated) {
      router.push(`/verify/${id}`);
    } else {
      setShowLoginSheet(true);
    }
  };

  // Submit Report Action
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toilet) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/toilets/${toilet.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      if (res.ok) {
        showToast("Report submitted.", "success");
        setShowReportSheet(false);
      } else {
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to submit report. Try again.", "error");
    } finally {
      setReportLoading(false);
    }
  };

  const getNotionVerification = (updatedAtStr: string) => {
    const updatedAt = new Date(updatedAtStr);
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return {
        bg: "bg-brand-greenLight",
        dot: "bg-brand-green",
        text: "text-brand-greenText",
        label: "Verified just now",
      };
    } else if (diffHours < 12) {
      return {
        bg: "bg-brand-yellowLight",
        dot: "bg-brand-yellow",
        text: "text-brand-yellowText",
        label: `Verified ${Math.floor(diffHours)}h ago`,
      };
    } else if (diffHours < 48) {
      return {
        bg: "bg-neutral-100",
        dot: "bg-neutral-400",
        text: "text-neutral-600",
        label: "Verified yesterday",
      };
    } else {
      return {
        bg: "bg-brand-coralLight",
        dot: "bg-brand-coral",
        text: "text-brand-coralText",
        label: "Needs verification",
      };
    }
  };

  const renderStars = (score: number) => {
    const rounded = Math.round(score);
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 fill-current ${
              star <= rounded ? "text-brand-yellow" : "text-neutral-200"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 w-full max-w-md mx-auto flex flex-col text-left">
        <div className="w-full h-[220px] skeleton rounded-none" />
        <div className="px-4 pt-5 pb-8 space-y-4">
          <div className="h-6 w-3/4 skeleton" />
          <div className="h-4 w-1/2 skeleton" />
          <div className="h-12 w-full skeleton" />
          <div className="h-40 w-full skeleton" />
        </div>
      </div>
    );
  }

  // 404 Page Not Found
  if (error || !toilet) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto"
      >
        <div className="w-10 h-10 border-[1.5px] border-neutral-200 rounded-xl flex items-center justify-center text-xl text-neutral-400 font-mono mb-4">
          ?
        </div>
        <h2 className="text-base font-medium text-neutral-900">This toilet couldn&apos;t be found.</h2>
        <p className="text-sm text-neutral-600 mt-1.5 max-w-xs leading-relaxed">It might have been removed by an admin or does not exist.</p>
        <Link href="/" className="mt-4">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            className="bg-brand-green hover:bg-brand-greenDark text-white text-[13px] font-medium h-[52px] px-6 rounded-[14px] transition-colors shadow-button"
          >
            Find Toilets Near Me
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  const verStatus = getNotionVerification(toilet.updated_at);
  const overallRating = toilet.overall_score;
  const imageUrl = toilet.public_image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="min-h-screen bg-neutral-50 text-neutral-900 w-full max-w-md mx-auto flex flex-col text-left relative pb-[env(safe-area-inset-bottom)]"
    >
      
      {/* Back navigation */}
      <div className="absolute top-3 left-3 z-10">
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.08 }}
          onClick={() => router.back()}
          className="w-7 h-7 rounded-full bg-white/80 border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 shadow-button active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </motion.button>
      </div>

      {/* Full-bleed cover photo */}
      <div className="w-full h-[220px] bg-neutral-100 overflow-hidden relative">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={toilet.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
            <Camera className="w-8 h-8 text-neutral-400" />
            <span className="text-xs mt-2 font-medium">No Image Available</span>
          </div>
        )}
      </div>

      {/* Details Content Container */}
      <div className="px-4 pt-5 pb-8 flex-1 flex flex-col">
        
        {/* Title Area */}
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold text-neutral-900 tracking-tight leading-snug">
            {toilet.name}
          </h2>
          <p className="text-[14px] text-neutral-600 mt-1 leading-normal">
            {toilet.location_name}
          </p>
        </div>

        {/* Verification Banner */}
        <div className={`flex items-center justify-between border-t border-b border-neutral-200 py-3 my-4 rounded-[14px] px-4 ${verStatus.bg} ${verStatus.text}`}>
          <div className="flex items-center gap-2 text-[14px]">
            <span className={`w-2 h-2 rounded-full ${verStatus.dot}`}></span>
            <span className="font-medium">{verStatus.label}</span>
          </div>
          <span className="font-mono text-xs">
            {overallRating > 0 ? `${overallRating.toFixed(1)} / 5` : "— / 5"}
          </span>
        </div>

        {/* Properties Section */}
        <div className="mt-2">
          <span className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block mb-2">
            DETAILS
          </span>
          
          <div className="flex flex-col">
            {[
              { label: "Bathroom type", val: toilet.type },
              { label: "Toilet type", val: toilet.toilet_type },
              { label: "Gender access", val: toilet.gender_access },
              { label: "Accessibility", val: toilet.is_accessible ? "Accessible" : "Not accessible" },
              { label: "Soap", val: toilet.has_soap ? "Available" : "Not available" },
              { label: "Mirror", val: toilet.has_mirror ? "Available" : "Not available" },
              { label: "Sanitary bin", val: toilet.has_sanitary_disposal ? "Available" : "Not available" },
            ].map((prop) => (
              <div key={prop.label} className="flex items-center py-2 border-b border-neutral-200 last:border-none min-h-[40px]">
                <span className="w-32 flex-shrink-0 text-[12px] font-normal text-neutral-400">
                  {prop.label}
                </span>
                <span className="text-[14px] text-neutral-900 font-normal">
                  {prop.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ratings Section */}
        <div className="mt-6">
          <span className="text-[11px] font-normal tracking-wide uppercase text-neutral-400 block mb-2">
            RATINGS
          </span>

          <div className="flex flex-col">
            {[
              { label: "Cleanliness", val: toilet.avg_cleanliness },
              { label: "Smell", val: toilet.avg_smell },
              { label: "Lighting", val: toilet.avg_lighting },
              { label: "Women safety", val: toilet.avg_women_safety },
              { label: "Water availability", val: toilet.avg_water_availability },
            ].map((prop) => (
              <div key={prop.label} className="flex items-center justify-between py-2 border-b border-neutral-200 last:border-none min-h-[40px]">
                <span className="text-[12px] text-neutral-600">
                  {prop.label}
                </span>
                <div className="flex items-center gap-2">
                  {renderStars(prop.val)}
                  <span className="font-mono text-xs text-neutral-900 w-6 text-right">
                    {prop.val > 0 ? prop.val.toFixed(1) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Map */}
        <div className="w-full h-40 rounded-[20px] overflow-hidden border border-neutral-200 relative mt-6 bg-neutral-100 shadow-card">
          <MapView
            toilets={[toilet]}
            selectedToilet={toilet}
            onSelectToilet={() => {}}
            userCoords={null}
            isAddingMode={false}
            interactive={false}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={handleGetDirections}
              className="flex-1 h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] flex items-center justify-center gap-2 transition-colors shadow-button"
            >
              <Navigation className="w-4 h-4 text-white" strokeWidth={1.5} />
              Get Directions
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08 }}
              onClick={handleShare}
              className="w-12 h-[52px] bg-transparent border border-neutral-200 text-neutral-900 hover:bg-neutral-50 rounded-[14px] flex items-center justify-center transition-colors"
              title="Share Restroom"
            >
              <svg className="w-4.5 h-4.5 text-neutral-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.632-2.316m0 7.148l-4.632-2.316M21 12a3 3 0 11-6 0 3 3 0 016 0zm-11-6a3 3 0 11-6 0 3 3 0 016 0zm0 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            onClick={handleVerifyClick}
            className="w-full h-[52px] bg-transparent border border-neutral-200 text-neutral-900 hover:bg-neutral-50 text-[14px] font-medium rounded-[14px] flex items-center justify-center transition-colors"
          >
            Verify / Update
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            onClick={() => setShowReportSheet(true)}
            className="text-center text-[13px] text-neutral-400 hover:text-brand-coral mt-2 transition-colors focus:outline-none py-2"
          >
            Report an issue
          </motion.button>
        </div>

      </div>

      {/* Login Prompt Sheet */}
      <BottomSheet
        isOpen={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        title="Login Required"
      >
        <div className="flex flex-col items-center text-center p-2 gap-4">
          <h4 className="font-medium text-sm text-neutral-900">Login to contribute</h4>
          <p className="text-xs text-neutral-600 leading-relaxed -mt-2">
            SafeToilets requires Google verification before allowing reviews or edits to prevent spam.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            onClick={() => {
              sessionStorage.setItem("authRedirectPath", `/verify/${id}`);
              loginWithGoogle();
            }}
            className="w-full h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] transition-colors shadow-button"
          >
            Continue with Google
          </motion.button>
        </div>
      </BottomSheet>

      {/* Report Sheet */}
      <BottomSheet
        isOpen={showReportSheet}
        onClose={() => setShowReportSheet(false)}
        title="Report an Issue"
      >
        <form onSubmit={handleReportSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-neutral-600">Please select the reason for reporting this restroom listing:</p>
          
          <div className="flex flex-col border border-neutral-200 rounded-[14px] overflow-hidden divide-y divide-neutral-200">
            {[
              { key: "wrong_image", label: "Wrong image" },
              { key: "fake_restroom", label: "Fake restroom" },
              { key: "closed_restroom", label: "Closed restroom" },
              { key: "incorrect_information", label: "Incorrect information" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 cursor-pointer transition select-none min-h-[40px]"
              >
                <input
                  type="radio"
                  name="report_reason"
                  value={opt.key}
                  checked={reportReason === opt.key}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-4 h-4 text-brand-green border-neutral-400 bg-white focus:ring-brand-green/20"
                />
                <span className="text-[14px] font-normal text-neutral-900">{opt.label}</span>
              </label>
            ))}
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            disabled={reportLoading}
            className="w-full h-[52px] bg-brand-green hover:bg-brand-greenDark text-white text-[14px] font-medium rounded-[14px] transition-colors shadow-button disabled:opacity-50"
          >
            {reportLoading ? "Submitting Report..." : "Submit Report"}
          </motion.button>
        </form>
      </BottomSheet>

    </motion.div>
  );
}
