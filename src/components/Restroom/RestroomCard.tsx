import { Restroom } from "@/types";

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
  return `Verified on ${date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

export default function RestroomCard({
  restroom,
  userCoords,
  onSelect,
}: RestroomCardProps) {
  const distance = userCoords
    ? calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        restroom.latitude,
        restroom.longitude
      )
    : null;

  const score = restroom.overall_score;
  let scoreColor = "bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700";
  let scoreLabel = "Unverified";

  if (score > 0) {
    if (score >= 3.8) {
      scoreColor = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50";
      scoreLabel = "Clean";
    } else if (score >= 2.5) {
      scoreColor = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50";
      scoreLabel = "Average";
    } else {
      scoreColor = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50";
      scoreLabel = "Poor";
    }
  }

  return (
    <div
      onClick={() => onSelect(restroom)}
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-stone-300 dark:hover:border-stone-700 active:scale-[0.99] transition-all"
    >
      {/* Restroom Image or fallback */}
      <div className="w-24 h-24 rounded-xl bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-stone-200/55 dark:border-stone-800">
        {restroom.public_image_url ? (
          <img
            src={restroom.public_image_url}
            alt={restroom.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-400 dark:text-stone-600">
            {/* Minimal SVG toilet fallback */}
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-[9px] mt-1 font-semibold tracking-wider">NO PHOTO</span>
          </div>
        )}
      </div>

      {/* Details Area */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Header row: Title & Score Badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-stone-900 dark:text-stone-50 text-base leading-tight truncate">
              {restroom.name}
            </h3>
            <span
              className={`text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full border ${scoreColor} flex-shrink-0`}
            >
              {score > 0 ? `${score.toFixed(1)} ${scoreLabel}` : scoreLabel}
            </span>
          </div>

          {/* Location / Area Name */}
          <p className="text-stone-500 dark:text-stone-400 text-xs mt-1 truncate">
            {restroom.location_name}
          </p>

          {/* Verification time & distance */}
          <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-stone-400 dark:text-stone-500">
            <span>{formatTimeAgo(restroom.updated_at)}</span>
            {distance !== null && (
              <>
                <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700"></span>
                <span className="text-stone-600 dark:text-stone-300">
                  {formatDistance(distance)} away
                </span>
              </>
            )}
          </div>
        </div>

        {/* Facilities icons row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-stone-850/60">
          <div className="flex items-center gap-1.5 text-stone-400 dark:text-stone-600">
            {/* Soap Icon */}
            {restroom.has_soap && (
              <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 p-1 rounded font-medium">
                Soap
              </span>
            )}
            {/* Mirror Icon */}
            {restroom.has_mirror && (
              <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 p-1 rounded font-medium">
                Mirror
              </span>
            )}
            {/* Sanitary Pad Disposal Icon */}
            {restroom.has_sanitary_disposal && (
              <span className="text-xs bg-stone-105/30 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 p-1 rounded font-medium">
                Pad Box
              </span>
            )}
            {!restroom.has_soap && !restroom.has_mirror && !restroom.has_sanitary_disposal && (
              <span className="text-[10px] italic text-stone-400 dark:text-stone-500">
                Basic amenities unverified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-700 dark:text-stone-300">
            {/* Bathroom details */}
            <span className="bg-stone-100 dark:bg-stone-850 px-1.5 py-0.5 rounded text-[10px]">
              {restroom.type === "Railway / Bus Station" ? "Station" : restroom.type}
            </span>
            <span className="bg-stone-100 dark:bg-stone-850 px-1.5 py-0.5 rounded text-[10px]">
              {restroom.gender_access === "Both" ? "M/F" : restroom.gender_access}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
