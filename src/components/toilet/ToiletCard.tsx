"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Restroom } from "@/types";
import { formatTimeAgo } from "@/lib/utils/time";
import { formatDistance } from "@/lib/utils/distance";
import { ChevronRight, Camera, Star } from "lucide-react";

interface ToiletCardProps {
  toilet: Restroom;
  distance: number | null;
}

export default function ToiletCard({ toilet, distance }: ToiletCardProps) {
  const [imgError, setImgError] = useState(false);
  const score = toilet.overall_score;

  const formattedDistance = distance !== null ? formatDistance(distance) : null;
  const imageUrl = toilet.public_image_url;

  let scoreColor = "text-neutral-600";
  if (score > 0) {
    if (score >= 4.0) {
      scoreColor = "text-brand-greenText";
    } else if (score >= 2.5) {
      scoreColor = "text-brand-yellowText";
    } else {
      scoreColor = "text-brand-coralText";
    }
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } }
      }}
      className="w-full"
    >
      <Link
        href={`/toilet/${toilet.id}`}
        className="px-4 py-3 flex gap-3 items-center hover:bg-neutral-100 transition-colors duration-100 w-full text-left"
      >
        {/* Left block (image): 64x64px, rounded-lg */}
        <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-neutral-200">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={`${toilet.name} (${toilet.type}) at ${toilet.location_name}`}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
              <Camera className="w-5 h-5 text-neutral-400" />
            </div>
          )}
        </div>

        {/* Right block (content) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Title */}
          <h3 className="text-[14px] font-medium text-neutral-900 truncate leading-tight mb-1">
            {toilet.name}
          </h3>

          {/* Notion property row (horizontal) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {formattedDistance !== null && (
              <>
                <span className="font-mono text-xs text-brand-greenText">
                  {formattedDistance}
                </span>
                <span className="text-neutral-200">·</span>
              </>
            )}

            <span className={`text-xs font-semibold ${scoreColor} flex items-center gap-0.5`}>
              {score > 0 ? (
                <>
                  {score.toFixed(1)}
                  <Star className="w-3 h-3 fill-current text-brand-yellow" />
                </>
              ) : "—"}
            </span>
            
            <span className="text-neutral-200">·</span>
            
            <span className="text-xs text-neutral-600 truncate">
              {toilet.type}
            </span>
          </div>

          {/* Timestamp */}
          <div className="font-mono text-[11px] text-neutral-400 mt-1.5">
            {formatTimeAgo(toilet.updated_at)}
          </div>
        </div>

        {/* Apple table disclosure indicator */}
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 ml-auto" />
      </Link>
    </motion.div>
  );
}
