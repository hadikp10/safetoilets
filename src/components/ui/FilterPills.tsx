import React from "react";

interface FilterPillsProps {
  activeFilter: string;
  onChange: (filter: string) => void;
}

const PILLS = [
  { key: "all", label: "All" },
  { key: "clean", label: "Clean" },
  { key: "womenSafe", label: "Women safe" },
  { key: "accessible", label: "Accessible" },
  { key: "twentyFourHours", label: "24hr" },
];

export default function FilterPills({ activeFilter, onChange }: FilterPillsProps) {
  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2 px-4 flex gap-1 whitespace-nowrap bg-white border-b border-[#E9E9E7]">
      {PILLS.map((pill) => {
        const isActive = activeFilter === pill.key;
        return (
          <button
            key={pill.key}
            onClick={() => onChange(pill.key)}
            className={`text-[11px] font-medium tracking-wide px-2.5 py-1 rounded-md transition-colors duration-150 border ${
              isActive
                ? "bg-[#EBFBEE] border-[#2F9E44] text-[#1E6E2E]"
                : "bg-[#F7F7F5] border-[#E9E9E7] text-[#6B6B6B]"
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
