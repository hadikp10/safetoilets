import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Restroom } from "@/types";
import { formatTimeAgo } from "@/lib/utils/time";
import { formatDistance } from "@/lib/utils/distance";

interface ToiletCardProps {
  toilet: Restroom;
  distance: number | null;
}

export default function ToiletCard({ toilet, distance }: ToiletCardProps) {
  const [imgError, setImgError] = useState(false);
  const score = toilet.overall_score;
  const ratingLabel = score >= 4 ? "Clean" : score >= 2.5 ? "Average" : "Poor";
  const ratingColor = score >= 4 ? "bg-brand-green" : score >= 2.5 ? "bg-brand-yellow" : "bg-brand-red";

  const formattedDistance = distance !== null ? formatDistance(distance) : null;
  const imageUrl = toilet.public_image_url;

  return (
    <Link
      href={`/toilet/${toilet.id}`}
      className="block bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-3 hover:bg-surface-muted dark:hover:bg-dark-muted transition active:scale-[0.99]"
    >
      <div className="flex gap-3">
        {/* Left image thumbnail */}
        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-surface-muted dark:bg-dark-muted flex items-center justify-center relative border border-surface-border dark:border-dark-border">
          <Image
            src={imgError || !imageUrl ? "/placeholder-toilet.png" : imageUrl}
            alt={toilet.name}
            fill
            sizes="72px"
            className="object-cover"
            onError={() => setImgError(true)}
            priority={false}
          />
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Line 1: Type badge */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-[10px] font-semibold text-text-secondary bg-surface-muted dark:bg-dark-muted dark:text-text-secondary px-2 py-0.5 rounded-full uppercase tracking-wider">
                {toilet.type}
              </span>
              {/* Line 2: Distance */}
              {formattedDistance && (
                <span className="font-mono text-xs font-medium text-brand-sky">
                  {formattedDistance}
                </span>
              )}
            </div>

            {/* Line 3: Cleanliness score row */}
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2.5 h-2.5 rounded-full ${ratingColor}`} />
              <span className="text-sm font-semibold text-text-primary dark:text-text-inverse">
                {score > 0 ? `${score.toFixed(1)} / 5` : "Unverified"}
              </span>
              {score > 0 && (
                <span className="text-xs text-text-secondary">({ratingLabel})</span>
              )}
            </div>
          </div>

          {/* Line 4: Facilities icons row */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-border dark:border-dark-border">
            <div className="flex items-center gap-3">
              {/* Water icon */}
              <span 
                className={`text-sm flex items-center ${toilet.avg_water_availability >= 3 ? "opacity-100" : "line-through opacity-40 text-text-disabled"}`}
                title="Water Availability"
              >
                💧
              </span>
              {/* Soap icon */}
              <span 
                className={`text-sm flex items-center ${toilet.has_soap ? "opacity-100" : "line-through opacity-40 text-text-disabled"}`}
                title="Soap Available"
              >
                🧴
              </span>
              {/* Accessible icon */}
              <span 
                className={`text-sm flex items-center ${toilet.is_accessible ? "opacity-100" : "line-through opacity-40 text-text-disabled"}`}
                title="Wheelchair Accessible"
              >
                ♿
              </span>
              {/* Women safe icon */}
              <span 
                className={`text-sm flex items-center ${toilet.avg_women_safety >= 3.8 ? "opacity-100" : "line-through opacity-40 text-text-disabled"}`}
                title="Women Safety verified"
              >
                🚺
              </span>
            </div>

            {/* Line 5: Timestamp */}
            <span className="font-mono text-[10px] text-text-secondary" suppressHydrationWarning>
              {formatTimeAgo(toilet.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
