import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E7E5E4] dark:border-stone-800 p-3 flex gap-3 animate-pulse">
      <div className="w-[72px] h-[72px] rounded-xl bg-[#F5F5F4] dark:bg-stone-800 flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-2 pt-1">
        <div className="h-3 w-16 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
        <div className="h-3 w-24 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
        <div className="h-3 w-32 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
        <div className="h-3 w-20 rounded-full bg-[#F5F5F4] dark:bg-stone-800 mt-auto" />
      </div>
    </div>
  );
}
