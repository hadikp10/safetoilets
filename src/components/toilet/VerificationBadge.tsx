import React from "react";
import { formatTimeAgo } from "@/lib/utils/time";

interface VerificationBadgeProps {
  updatedAt: string;
}

export default function VerificationBadge({ updatedAt }: VerificationBadgeProps) {
  const date = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let bgClass = "bg-brand-greenLight text-brand-greenDark border-brand-green/20";

  if (diffHours >= 24) {
    bgClass = "bg-surface-muted text-text-secondary border-surface-border";
  } else if (diffHours >= 1) {
    bgClass = "bg-brand-greenVeryLight text-brand-green border-brand-green/10";
  }

  const timeAgoStr = formatTimeAgo(updatedAt);
  const text = `✓ Verified ${timeAgoStr.charAt(0).toLowerCase() + timeAgoStr.slice(1)}`;

  return (
    <div 
      className={`w-full py-4 px-6 rounded-2xl border text-center text-base font-bold tracking-tight flex items-center justify-center gap-2 shadow-sm ${bgClass}`}
      suppressHydrationWarning
    >
      {text}
    </div>
  );
}
