import React from "react";

export default function SkeletonDetail() {
  return (
    <div className="flex flex-col gap-6 animate-pulse p-4">
      {/* 240px tall grey block (image placeholder) */}
      <div className="w-full h-60 rounded-2xl bg-[#F5F5F4] dark:bg-stone-800" />

      {/* Centered Cleanliness score block placeholder */}
      <div className="flex flex-col items-center gap-2 my-2">
        <div className="h-10 w-16 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
        <div className="h-3.5 w-24 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
      </div>

      {/* 52px pill block (verification badge placeholder) */}
      <div className="w-full h-[52px] rounded-2xl bg-[#F5F5F4] dark:bg-stone-800" />

      {/* Row of 3 small pills (info chips placeholder) */}
      <div className="flex gap-2.5">
        <div className="h-9 flex-1 bg-[#F5F5F4] dark:bg-stone-800 rounded-full" />
        <div className="h-9 flex-1 bg-[#F5F5F4] dark:bg-stone-800 rounded-full" />
        <div className="h-9 flex-1 bg-[#F5F5F4] dark:bg-stone-800 rounded-full" />
      </div>

      {/* 2x3 grid of small blocks (ratings placeholder) */}
      <div className="grid grid-cols-2 gap-4 bg-stone-50 dark:bg-stone-850/30 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-16 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
            <div className="h-3 w-28 rounded-full bg-[#F5F5F4] dark:bg-stone-800" />
          </div>
        ))}
      </div>

      {/* 160px map placeholder block */}
      <div className="w-full h-[160px] bg-[#F5F5F4] dark:bg-stone-800 rounded-2xl" />

      {/* 2 full-width button blocks */}
      <div className="flex flex-col gap-3">
        <div className="w-full h-[52px] rounded-2xl bg-[#F5F5F4] dark:bg-stone-800" />
        <div className="w-full h-[52px] rounded-2xl bg-[#F5F5F4] dark:bg-stone-800" />
      </div>
    </div>
  );
}
