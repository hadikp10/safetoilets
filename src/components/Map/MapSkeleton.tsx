import React from "react";

export default function MapSkeleton() {
  return (
    <div className="w-full h-[55vh] min-h-[300px] rounded-b-2xl bg-neutral-100 animate-pulse relative flex flex-col items-center justify-center border-b border-neutral-200">
      {/* Visual coordinates grid mock lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(161,161,170,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(161,161,170,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Concentric Loader Center */}
      <div className="relative w-32 h-32 rounded-full border-2 border-neutral-200 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border border-neutral-200 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-brand-green/20 animate-ping" />
        </div>
      </div>
      
      <div className="mt-4 flex flex-col items-center gap-1 z-10">
        <span className="text-xs font-semibold text-neutral-600">Loading map viewport...</span>
      </div>
    </div>
  );
}
