import { Restroom } from "@/types";
import { formatTimeAgo, calculateDistance, formatDistance } from "./RestroomCard";

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
  const distance = userCoords
    ? calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        restroom.latitude,
        restroom.longitude
      )
    : null;

  // Rating indicator colors helper
  const getRatingColor = (score: number) => {
    if (score >= 3.8) return "bg-emerald-500";
    if (score >= 2.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  const overallRating = restroom.overall_score;

  // Directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restroom.latitude},${restroom.longitude}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-855 rounded-t-[2rem] max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl animate-slide-up pb-safe">
      {/* Drag handle pill */}
      <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto my-3 cursor-pointer" onClick={onClose}></div>

      {/* Main Container */}
      <div className="px-6 pb-8">
        
        {/* Title and Close Button */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 dark:text-stone-50 leading-tight">
              {restroom.name}
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">
              {restroom.location_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 active:scale-95 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Display */}
        <div className="w-full h-48 rounded-2xl bg-stone-100 dark:bg-stone-800 overflow-hidden relative mb-6 border border-stone-200/50 dark:border-stone-800">
          {restroom.public_image_url ? (
            <img
              src={restroom.public_image_url}
              alt={restroom.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs mt-2 font-bold tracking-wider uppercase">No image uploaded yet</span>
            </div>
          )}

          {/* Quick Details Floating badges */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
              {restroom.type}
            </span>
            {distance !== null && (
              <span className="bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                {formatDistance(distance)} away
              </span>
            )}
          </div>
        </div>

        {/* Verification Timestamp - Very Visually Important! */}
        <div className="bg-stone-50 dark:bg-stone-850/50 border border-stone-100 dark:border-stone-800 rounded-xl p-3 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
              STATUS
            </span>
          </div>
          <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
            {formatTimeAgo(restroom.updated_at)}
          </span>
        </div>

        {/* Grid: Details Metadata & Facilities checklist */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Metadata Specs */}
          <div className="bg-stone-50 dark:bg-stone-850/30 rounded-xl p-4 border border-stone-100 dark:border-stone-800/40">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
              Specifications
            </h3>
            <ul className="space-y-2 text-xs font-semibold text-stone-800 dark:text-stone-300">
              <li className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Access:</span>
                <span>{restroom.gender_access}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Toilet Type:</span>
                <span>{restroom.toilet_type}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Accessible:</span>
                <span className={restroom.is_accessible ? "text-emerald-600 dark:text-emerald-400" : "text-stone-500"}>
                  {restroom.is_accessible ? "Wheelchair Accessible" : "No"}
                </span>
              </li>
            </ul>
          </div>

          {/* Features Checkboxes */}
          <div className="bg-stone-50 dark:bg-stone-850/30 rounded-xl p-4 border border-stone-100 dark:border-stone-800/40">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
              Verified Facilities
            </h3>
            <ul className="space-y-2 text-xs font-semibold">
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${restroom.has_soap ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`}></span>
                <span className={restroom.has_soap ? "text-stone-800 dark:text-stone-200" : "text-stone-400 dark:text-stone-600"}>
                  Soap Available
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${restroom.has_mirror ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`}></span>
                <span className={restroom.has_mirror ? "text-stone-800 dark:text-stone-200" : "text-stone-400 dark:text-stone-600"}>
                  Mirror Installed
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${restroom.has_sanitary_disposal ? "bg-emerald-500" : "bg-stone-300 dark:bg-stone-700"}`}></span>
                <span className={restroom.has_sanitary_disposal ? "text-stone-800 dark:text-stone-200" : "text-stone-400 dark:text-stone-600"}>
                  Sanitary Pad Box
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Ratings Breakdown (Clean Gen-Z Minimal Bars) */}
        <div className="bg-stone-50 dark:bg-stone-850/30 rounded-2xl p-4 mb-6 border border-stone-100 dark:border-stone-800/40">
          <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center justify-between">
            <span>Verified Ratings Breakdown</span>
            {overallRating > 0 && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
                {overallRating.toFixed(1)} / 5.0
              </span>
            )}
          </h3>

          {overallRating > 0 ? (
            <div className="space-y-3">
              {/* Cleanliness */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600 dark:text-stone-400">Cleanliness</span>
                  <span>{restroom.avg_cleanliness.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getRatingColor(restroom.avg_cleanliness)}`}
                    style={{ width: `${(restroom.avg_cleanliness / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Smell */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600 dark:text-stone-400">Smell</span>
                  <span>{restroom.avg_smell.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getRatingColor(restroom.avg_smell)}`}
                    style={{ width: `${(restroom.avg_smell / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Lighting */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600 dark:text-stone-400">Lighting Quality</span>
                  <span>{restroom.avg_lighting.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getRatingColor(restroom.avg_lighting)}`}
                    style={{ width: `${(restroom.avg_lighting / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Women Safety */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600 dark:text-stone-400">Women Safety Score</span>
                  <span>{restroom.avg_women_safety.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getRatingColor(restroom.avg_women_safety)}`}
                    style={{ width: `${(restroom.avg_women_safety / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Water Availability */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600 dark:text-stone-400">Water Availability</span>
                  <span>{restroom.avg_water_availability.toFixed(1)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getRatingColor(restroom.avg_water_availability)}`}
                    style={{ width: `${(restroom.avg_water_availability / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 dark:text-stone-400 italic text-center py-4">
              This toilet has not been rated yet. Be the first to verify details!
            </p>
          )}
        </div>

        {/* Action Buttons CTAs */}
        <div className="flex flex-col gap-3">
          {/* Main CTA: Directions */}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 bg-black text-white dark:bg-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] transition-transform text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Get Directions
          </a>

          {/* Secondary CTA: Verify / Update */}
          <button
            onClick={isAuthenticated ? onVerify : onLoginPrompt}
            className="w-full h-12 bg-stone-105 border border-stone-250 hover:bg-stone-200/50 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] transition-transform text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verify & Update Ratings
          </button>

          {/* Report Button */}
          <button
            onClick={onReport}
            className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-400 text-xs font-semibold py-2 transition-colors mx-auto"
          >
            Report incorrect information
          </button>
        </div>
      </div>
    </div>
  );
}
