import { useState } from "react";
import { Restroom } from "@/types";
import { formatTimeAgo, calculateDistance, formatDistance } from "./RestroomCard";
import { MapPin, Navigation, Zap, Flag, CheckCircle2, AlertCircle } from "lucide-react";

interface RestroomDetailProps {
  restroom: Restroom;
  userCoords: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onVerify: () => void;
  onReport: () => void;
  isAuthenticated: boolean;
  onLoginPrompt: () => void;
}

export default function RestroomDetail({
  restroom,
  userCoords,
  onClose,
  onVerify,
  onReport,
  isAuthenticated,
  onLoginPrompt,
}: RestroomDetailProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200); // Matches the sheet-exit 200ms duration
  };
  const distance = userCoords
    ? calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        restroom.latitude,
        restroom.longitude
      )
    : null;

  // Directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restroom.latitude},${restroom.longitude}`;

  // Verification status logic helper
  const getVerificationStatus = (updatedAtStr: string) => {
    const updatedAt = new Date(updatedAtStr);
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      return {
        bg: "bg-[#DCFCE7]",
        text: "text-[#15803D]",
        iconColor: "#16A34A",
        label: "Verified",
        pulse: true,
      };
    } else if (diffHours < 12) {
      return {
        bg: "bg-[#FEF9C3]",
        text: "text-[#A16207]",
        iconColor: "#D97706",
        label: "Verified",
        pulse: false,
      };
    } else if (diffHours < 48) {
      return {
        bg: "bg-[#F5F5F4]",
        text: "text-[#78716C]",
        iconColor: "#A8A29E",
        label: "Verified",
        pulse: false,
      };
    } else {
      return {
        bg: "bg-[#FEE2E2]",
        text: "text-[#B91C1C]",
        iconColor: "#DC2626",
        label: "Needs re-verification",
        pulse: false,
      };
    }
  };

  const status = getVerificationStatus(restroom.updated_at);
  const overallRating = restroom.overall_score;

  // Cleanliness Score Color
  let cleanlinessColor = "text-[#78716C]";
  if (restroom.avg_cleanliness >= 4.0) {
    cleanlinessColor = "text-[#16A34A]";
  } else if (restroom.avg_cleanliness >= 2.5) {
    cleanlinessColor = "text-[#D97706]";
  } else if (restroom.avg_cleanliness > 0) {
    cleanlinessColor = "text-[#DC2626]";
  }

  const renderRatingStars = (label: string, ratingValue: number) => {
    const roundedRating = Math.round(ratingValue);
    return (
      <div className="flex flex-col items-start">
        <span className="text-xs text-text-secondary mb-0.5 font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className="text-[14px] leading-none"
                style={{ color: star <= roundedRating ? "#16A34A" : "#E7E5E4" }}
              >
                ★
              </span>
            ))}
          </div>
          <span className="text-sm font-bold text-text-primary dark:text-stone-100 ml-1.5">
            {ratingValue > 0 ? ratingValue.toFixed(1) : "—"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-200 ${
          isExiting ? "opacity-0" : "backdrop-enter opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-stone-900 rounded-t-3xl shadow-sheet max-h-[85vh] overflow-y-auto no-scrollbar pb-safe flex flex-col border-t border-stone-200 dark:border-stone-800 ${
          isExiting ? "sheet-exit" : "sheet-enter"
        }`}
      >
        {/* Drag handle: 4px wide, 32px long, rounded-full, bg-[#E7E5E4], mt-3 */}
        <div
          className="w-8 h-1 bg-[#E7E5E4] rounded-full mx-auto mt-3 mb-4 flex-shrink-0 cursor-pointer"
          onClick={handleClose}
        />

        {/* Content Container */}
        <div className="px-4 pb-8 flex-1">
          
          {/* Header Row */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary dark:text-stone-50 leading-tight">
                {restroom.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-text-secondary dark:text-stone-400">
                <MapPin className="w-4 h-4" strokeWidth={1.5} />
                <span className="text-xs font-medium">{restroom.location_name}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-surface-muted dark:bg-stone-800 flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-95 transition-transform"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Photo Box */}
          <div className="w-full h-48 rounded-2xl bg-surface-muted dark:bg-stone-850 overflow-hidden relative mb-4 border border-[#E7E5E4] dark:border-stone-800">
            {restroom.public_image_url && !imageError ? (
              <img
                src={restroom.public_image_url}
                alt={`${restroom.name} (${restroom.type}) at ${restroom.location_name}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5F5F4] dark:bg-stone-800 text-[#A8A29E]">
                <span className="text-2xl" role="img" aria-label="camera">📷</span>
                <span className="text-xs mt-2 font-semibold text-text-disabled">No Image Available</span>
              </div>
            )}

            {/* Float details tags */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                {restroom.type}
              </span>
              {distance !== null && (
                <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {formatDistance(distance)} away
                </span>
              )}
            </div>
          </div>

          {/* Cleanliness score ring hero */}
          <div className="flex flex-col items-center justify-center my-6">
            <span className={`text-5xl font-bold ${cleanlinessColor}`}>
              {restroom.avg_cleanliness > 0 ? restroom.avg_cleanliness.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-text-secondary mt-1">/ 5 overall</span>
          </div>

          {/* Verification trust badge */}
          <div className={`w-full h-[52px] ${status.bg} rounded-2xl px-4 flex items-center justify-between mb-6 shadow-button`}>
            <div className="flex items-center gap-2">
              {status.label === "Verified" ? (
                <CheckCircle2
                  className={`w-5 h-5 ${status.pulse ? "badge-pulse" : ""}`}
                  strokeWidth={1.5}
                  style={{ color: status.iconColor }}
                />
              ) : (
                <AlertCircle
                  className="w-5 h-5"
                  strokeWidth={1.5}
                  style={{ color: status.iconColor }}
                />
              )}
              <span className={`text-base font-semibold ${status.text}`}>
                {status.label}
              </span>
            </div>
            <span className={`font-mono text-sm font-medium ${status.text}`}>
              {formatTimeAgo(restroom.updated_at)}
            </span>
          </div>

          {/* Details Specifications */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Metadata specs */}
            <div className="bg-surface-muted dark:bg-stone-850/50 rounded-2xl p-4 border border-[#E7E5E4] dark:border-stone-800">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-3">
                Specifications
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-text-primary dark:text-stone-300">
                <li className="flex justify-between">
                  <span className="text-text-secondary">Access:</span>
                  <span>{restroom.gender_access}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-secondary">Toilet Type:</span>
                  <span>{restroom.toilet_type}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-secondary">Accessible:</span>
                  <span className={restroom.is_accessible ? "text-brand-green" : "text-text-secondary"}>
                    {restroom.is_accessible ? "Yes" : "No"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Features Checkboxes */}
            <div className="bg-surface-muted dark:bg-stone-850/50 rounded-2xl p-4 border border-[#E7E5E4] dark:border-stone-800">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-3">
                Verified Facilities
              </h3>
              <ul className="space-y-2 text-xs font-semibold">
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${restroom.has_soap ? "bg-brand-green" : "bg-text-disabled"}`}></span>
                  <span className={restroom.has_soap ? "text-text-primary dark:text-stone-200" : "text-text-secondary"}>
                    Soap Available
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${restroom.has_mirror ? "bg-brand-green" : "bg-text-disabled"}`}></span>
                  <span className={restroom.has_mirror ? "text-text-primary dark:text-stone-200" : "text-text-secondary"}>
                    Mirror Installed
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${restroom.has_sanitary_disposal ? "bg-brand-green" : "bg-text-disabled"}`}></span>
                  <span className={restroom.has_sanitary_disposal ? "text-text-primary dark:text-stone-200" : "text-text-secondary"}>
                    Sanitary Pad Box
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Ratings Breakdown Grid */}
          <div className="bg-surface-muted dark:bg-stone-850/30 rounded-2xl p-4 mb-6 border border-[#E7E5E4] dark:border-stone-800">
            <h3 className="text-xs font-bold text-text-primary dark:text-stone-105 mb-4">
              Ratings Breakdown
            </h3>

            {overallRating > 0 ? (
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                {renderRatingStars("Cleanliness", restroom.avg_cleanliness)}
                {renderRatingStars("Smell Quality", restroom.avg_smell)}
                {renderRatingStars("Lighting Quality", restroom.avg_lighting)}
                {renderRatingStars("Women Safety Score", restroom.avg_women_safety)}
                {renderRatingStars("Water Availability", restroom.avg_water_availability)}
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic text-center py-4">
                This toilet has not been rated yet.
              </p>
            )}
          </div>

          {/* CTA Actions */}
          <div className="flex flex-col gap-3">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-[52px] bg-brand-green text-white font-semibold rounded-2xl shadow-button hover:bg-brand-green-dark active:scale-[0.97] transition-all duration-150 flex items-center justify-center gap-2 text-base"
            >
              <Navigation className="w-5 h-5 text-white" strokeWidth={1.5} />
              Get Directions
            </a>

            <button
              onClick={isAuthenticated ? onVerify : onLoginPrompt}
              className="w-full h-[52px] bg-transparent border-[1.5px] border-brand-green text-brand-green font-semibold rounded-2xl hover:bg-[#DCFCE7] active:scale-[0.97] transition-all duration-150 flex items-center justify-center gap-2 text-base"
            >
              <Zap className="w-5 h-5 text-brand-green" strokeWidth={1.5} />
              Verify & Update Ratings
            </button>

            <button
              onClick={onReport}
              className="text-text-secondary hover:text-text-primary text-xs font-semibold py-2 transition-colors mx-auto flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" strokeWidth={1.5} />
              Report incorrect information
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
