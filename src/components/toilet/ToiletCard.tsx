"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Restroom } from "@/types";
import { formatTimeAgo } from "@/lib/utils/time";
import { formatDistance } from "@/lib/utils/distance";
import { ChevronRight, Star } from "lucide-react";

interface ToiletCardProps {
  toilet: Restroom;
  distance: number | null;
}

export default function ToiletCard({ toilet, distance }: ToiletCardProps) {
  const [imgError, setImgError] = useState(false);
  const cleanliness = toilet.avg_cleanliness;
  const formattedDistance = distance !== null ? formatDistance(distance) : null;
  const imageUrl = toilet.public_image_url;

  // Dynamic Open/Closed logic based on restroom type
  const openStatus = (() => {
    if (typeof window === "undefined") {
      return { statusText: "Open • Hours may vary", isOpen: true };
    }
    const currentHour = new Date().getHours();
    if (toilet.type === "Petrol Pump" || toilet.type === "Railway / Bus Station") {
      return { statusText: "Open 24 hours", isOpen: true };
    } else if (toilet.type === "Mall") {
      const openHour = 10;
      const closeHour = 22;
      if (currentHour >= openHour && currentHour < closeHour) {
        return { statusText: "Open • Closes 10 PM", isOpen: true };
      } else {
        return { statusText: "Closed • Opens 10 AM", isOpen: false };
      }
    } else if (toilet.type === "Restaurant") {
      const openHour = 11;
      const closeHour = 23;
      if (currentHour >= openHour && currentHour < closeHour) {
        return { statusText: "Open • Closes 11 PM", isOpen: true };
      } else {
        return { statusText: "Closed • Opens 11 AM", isOpen: false };
      }
    } else if (toilet.type === "Public Toilet") {
      const openHour = 6;
      const closeHour = 21;
      if (currentHour >= openHour && currentHour < closeHour) {
        return { statusText: "Open • Closes 9 PM", isOpen: true };
      } else {
        return { statusText: "Closed • Opens 6 AM", isOpen: false };
      }
    } else {
      const openHour = 8;
      const closeHour = 20;
      if (currentHour >= openHour && currentHour < closeHour) {
        return { statusText: "Open • Closes 8 PM", isOpen: true };
      } else {
        return { statusText: "Closed • Opens 8 AM", isOpen: false };
      }
    }
  })();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } }
      }}
      className="w-full bg-white rounded-2xl border border-surface-border shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.04)] hover:border-brand-green/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 overflow-hidden"
    >
      <Link
        href={`/toilet/${toilet.id}`}
        className="p-4 flex gap-4 items-start w-full text-left"
      >
        {/* Left block (image): Shown prominently ONLY if it exists, boosting trust */}
        {imageUrl && !imgError && (
          <div className="w-[90px] h-[90px] rounded-xl bg-neutral-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-neutral-200/60 shadow-sm">
            <img
              src={imageUrl}
              alt={`${toilet.name}`}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {/* Image verifier tag */}
            <div className="absolute bottom-1 left-1 bg-white/95 backdrop-blur-sm border border-neutral-200 text-brand-greenDark px-1 py-0.5 rounded text-[8px] font-bold flex items-center shadow-xs">
              📸 PHOTO
            </div>
          </div>
        )}

        {/* Right block (content) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Title */}
          <h3 className="text-sm font-semibold text-text-primary truncate leading-tight mb-1 font-sans">
            {toilet.name}
          </h3>

          {/* Cleanliness rating (Prioritized) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {cleanliness > 0 ? (
              <span className="text-xs font-semibold text-text-primary flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-brand-green text-brand-green" />
                <span>{cleanliness.toFixed(1)} Cleanliness</span>
                <span className="text-text-disabled font-normal">({toilet.verification_count})</span>
              </span>
            ) : (
              <span className="text-xs text-text-secondary font-medium flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-neutral-200 fill-none" />
                <span>No cleanliness reviews</span>
              </span>
            )}
          </div>

          {/* Location, Distance, and Open/Closed status (Prioritized) */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-text-secondary mt-1">
            {formattedDistance !== null && (
              <>
                <span className="font-mono text-brand-greenDark font-medium">
                  {formattedDistance}
                </span>
                <span className="text-neutral-200">·</span>
              </>
            )}

            <span className={openStatus.isOpen ? "text-brand-greenDark font-medium" : "text-text-secondary font-medium"}>
              {openStatus.statusText}
            </span>

            <span className="text-neutral-200">·</span>

            <span className="truncate max-w-[80px]">
              {toilet.type}
            </span>
          </div>

          {/* Amenities checklist row (Prioritized) */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {toilet.is_accessible && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] font-medium tracking-tight border border-neutral-100">
                ♿ Accessible
              </span>
            )}
            {toilet.has_soap && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] font-medium tracking-tight border border-neutral-100">
                🧼 Soap
              </span>
            )}
            {toilet.has_mirror && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] font-medium tracking-tight border border-neutral-100">
                🪞 Mirror
              </span>
            )}
            {toilet.has_sanitary_disposal && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-[10px] font-medium tracking-tight border border-neutral-100">
                🌸 Sanitary Bin
              </span>
            )}
          </div>

          {/* Timestamp */}
          <div className="font-mono text-[9px] text-text-disabled mt-2">
            Updated {formatTimeAgo(toilet.updated_at)}
          </div>
        </div>

        {/* Apple table disclosure indicator */}
        <ChevronRight className="w-4 h-4 text-neutral-300 flex-shrink-0 ml-auto self-center" />
      </Link>
    </motion.div>
  );
}
