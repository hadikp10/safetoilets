import { useState } from "react";
import { Restroom } from "@/types";
import { Droplets, Sparkles, Accessibility, Shield } from "lucide-react";

interface RestroomCardProps {
  restroom: Restroom;
  userCoords: { latitude: number; longitude: number } | null;
  onSelect: (restroom: Restroom) => void;
}

// Haversine formula helper
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Verified just now";
  if (diffMins < 60) return `Verified ${diffMins}m ago`;
  if (diffHours < 24) return `Verified ${diffHours}h ago`;
  if (diffHours < 48) return "Verified yesterday";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `Verified on ${day}/${month}/${year}`;
}

export default function RestroomCard({
  restroom,
  userCoords,
  onSelect,
}: RestroomCardProps) {
  const [imageError, setImageError] = useState(false);
  const distance = userCoords
    ? calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        restroom.latitude,
        restroom.longitude
      )
    : null;

  const score = restroom.overall_score;
  let dotColor = "bg-[#78716C]";
  let labelColor = "text-[#78716C]";
  let scoreLabel = "Unverified";

  if (score > 0) {
    if (score >= 4.0) {
      dotColor = "bg-[#16A34A]";
      labelColor = "text-[#16A34A]";
      scoreLabel = "Clean";
    } else if (score >= 2.5) {
      dotColor = "bg-[#D97706]";
      labelColor = "text-[#D97706]";
      scoreLabel = "Average";
    } else {
      dotColor = "bg-[#DC2626]";
      labelColor = "text-[#DC2626]";
      scoreLabel = "Poor";
    }
  }

  // Facility availability rules
  const hasWater = score === 0 || restroom.avg_water_availability >= 3.0;
  const hasSoap = restroom.has_soap;
  const hasAccessibility = restroom.is_accessible;
  const hasWomenSafety = restroom.has_sanitary_disposal || restroom.avg_women_safety >= 3.0;

  return (
    <div
      onClick={() => onSelect(restroom)}
      className="bg-white dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-800 rounded-2xl p-3 flex gap-3 items-start cursor-pointer hover:border-stone-300 dark:hover:border-stone-700 shadow-card active:scale-[0.98] transition-transform duration-100"
    >
      {/* Left block (image): 72x72px, rounded-xl */}
      <div className="w-[72px] h-[72px] rounded-xl bg-surface-muted dark:bg-stone-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-stone-200/50 dark:border-stone-800">
        {restroom.public_image_url && !imageError ? (
          <img
            src={restroom.public_image_url}
            alt={`${restroom.name} (${restroom.type}) at ${restroom.location_name}`}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F4] dark:bg-stone-800 rounded-xl flex items-center justify-center text-[#A8A29E]">
            <span className="text-xl">📷</span>
          </div>
        )}
      </div>

      {/* Right block (content) */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* Row 1 — Type badge */}
        <div className="inline-flex w-fit bg-surface-muted dark:bg-stone-800 rounded-full px-2 py-0.5 text-[10px] font-medium text-text-secondary uppercase tracking-wide">
          {restroom.type === "Railway / Bus Station" ? "Station" : restroom.type}
        </div>

        {/* Title */}
        <h3 className="font-bold text-stone-900 dark:text-stone-50 text-sm leading-snug truncate">
          {restroom.name}
        </h3>

        {/* Row 2 — Distance */}
        {distance !== null && (
          <div className="font-mono text-xs font-medium text-brand-sky">
            {formatDistance(distance)} away
          </div>
        )}

        {/* Row 3 — Score row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
          <span className="text-sm font-bold text-text-primary dark:text-stone-105">
            {score > 0 ? score.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-text-disabled">/</span>
          <span className="text-xs text-text-disabled">5</span>
          <span className={`text-xs font-medium ml-1 ${labelColor}`}>
            {scoreLabel}
          </span>
        </div>

        {/* Row 4 — Facility icons */}
        <div className="flex items-center gap-2 mt-1.5">
          <div title={hasWater ? "Water Available" : "Water Unavailable"}>
            <Droplets 
              className={`w-[14px] h-[14px] transition-opacity ${hasWater ? "opacity-100 text-brand-sky" : "opacity-30 text-text-secondary"}`} 
              strokeWidth={1.5}
            />
          </div>
          <div title={hasSoap ? "Soap Available" : "Soap Unavailable"}>
            <Sparkles 
              className={`w-[14px] h-[14px] transition-opacity ${hasSoap ? "opacity-100 text-brand-green" : "opacity-30 text-text-secondary"}`} 
              strokeWidth={1.5}
            />
          </div>
          <div title={hasAccessibility ? "Wheelchair Accessible" : "Not Accessible"}>
            <Accessibility 
              className={`w-[14px] h-[14px] transition-opacity ${hasAccessibility ? "opacity-100 text-blue-500" : "opacity-30 text-text-secondary"}`} 
              strokeWidth={1.5}
            />
          </div>
          <div title={hasWomenSafety ? "Women Safety Verified" : "Women Safety Not Rated"}>
            <Shield 
              className={`w-[14px] h-[14px] transition-opacity ${hasWomenSafety ? "opacity-100 text-purple-500" : "opacity-30 text-text-secondary"}`} 
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Row 5 — Timestamp */}
        <div className="font-mono text-[10px] text-text-disabled mt-2">
          {formatTimeAgo(restroom.updated_at)}
        </div>
      </div>
    </div>
  );
}
