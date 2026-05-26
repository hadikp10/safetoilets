import { useState } from "react";
import Link from "next/link";
import { Restroom } from "@/types";
import { formatTimeAgo } from "@/lib/utils/time";
import { formatDistance } from "@/lib/utils/distance";
import { ChevronRight } from "lucide-react";

interface ToiletCardProps {
  toilet: Restroom;
  distance: number | null;
}

export default function ToiletCard({ toilet, distance }: ToiletCardProps) {
  const [imgError, setImgError] = useState(false);
  const score = toilet.overall_score;

  const formattedDistance = distance !== null ? formatDistance(distance) : null;
  const imageUrl = toilet.public_image_url;

  let scoreColor = "text-[#6B6B6B]";
  if (score > 0) {
    if (score >= 4.0) {
      scoreColor = "text-[#1E6E2E]";
    } else if (score >= 2.5) {
      scoreColor = "text-[#B85C00]";
    } else {
      scoreColor = "text-[#C21010]";
    }
  }

  return (
    <Link
      href={`/toilet/${toilet.id}`}
      className="px-4 py-3 flex gap-3 items-center hover:bg-[#EFEEEB] transition-colors duration-100 w-full text-left"
    >
      {/* Left block (image): 64x64px, rounded-lg */}
      <div className="w-16 h-16 rounded-lg bg-[#F5F5F4] overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-[#E9E9E7]/50">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={`${toilet.name} (${toilet.type}) at ${toilet.location_name}`}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-[#F5F5F4] rounded-lg flex items-center justify-center text-[#999999]">
            <span className="text-xl">📷</span>
          </div>
        )}
      </div>

      {/* Right block (content) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Title */}
        <h3 className="text-[14px] font-medium text-[#191919] truncate leading-tight mb-1">
          {toilet.name}
        </h3>

        {/* Notion property row (horizontal) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {formattedDistance !== null && (
            <>
              <span className="font-mono text-xs text-[#1971C2]">
                {formattedDistance}
              </span>
              <span className="text-[#D3D3CF]">·</span>
            </>
          )}

          <span className={`text-xs font-semibold ${scoreColor}`}>
            {score > 0 ? `${score.toFixed(1)} ★` : "—"}
          </span>
          
          <span className="text-[#D3D3CF]">·</span>
          
          <span className="text-xs text-[#6B6B6B] truncate">
            {toilet.type}
          </span>
        </div>

        {/* Timestamp */}
        <div className="font-mono text-[11px] text-[#999999] mt-1.5">
          {formatTimeAgo(toilet.updated_at)}
        </div>
      </div>

      {/* Apple table disclosure indicator */}
      <ChevronRight className="w-3.5 h-3.5 text-[#D3D3CF] flex-shrink-0 ml-auto" />
    </Link>
  );
}
