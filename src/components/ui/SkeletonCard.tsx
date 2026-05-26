import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-surface-card dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-3 flex gap-3 animate-pulse">
      {/* Card image placeholder */}
      <div className="rounded-xl bg-surface-muted dark:bg-dark-muted h-[72px] w-[72px] flex-shrink-0" />
      
      {/* Right content skeleton */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="space-y-2">
          {/* Badge line */}
          <div className="rounded bg-surface-muted dark:bg-dark-muted h-2 w-[25%]" />
          {/* Title line */}
          <div className="rounded bg-surface-muted dark:bg-dark-muted h-3.5 w-[60%]" />
          {/* Score/Label line */}
          <div className="rounded bg-surface-muted dark:bg-dark-muted h-2.5 w-[45%]" />
        </div>
        {/* Verification stamp line */}
        <div className="rounded bg-surface-muted dark:bg-dark-muted h-2 w-[50%] mt-2" />
      </div>
    </div>
  );
}
