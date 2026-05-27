import React from "react";

interface FilterPillsProps {
  activeFilters: string[];
  onChange: (filters: string[]) => void;
}

const PILLS = [
  { key: "all", label: "All" },
  { key: "clean", label: "Clean ✓" },
  { key: "womenSafe", label: "Women Safe" },
  { key: "accessible", label: "Accessible ♿" },
  { key: "twentyFourHours", label: "24 Hours" },
];

export default function FilterPills({ activeFilters, onChange }: FilterPillsProps) {
  const handlePillClick = (key: string) => {
    if (key === "all") {
      onChange(["all"]);
      return;
    }

    let next = activeFilters.filter((f) => f !== "all");
    if (next.includes(key)) {
      next = next.filter((f) => f !== key);
    } else {
      next.push(key);
    }

    if (next.length === 0) {
      onChange(["all"]);
    } else {
      onChange(next);
    }
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-hide py-2 px-4 flex gap-1 whitespace-nowrap bg-white border-b border-[#E9E9E7]">
      {PILLS.map((pill) => {
        const isActive = activeFilters.includes(pill.key);
        return (
          <button
            key={pill.key}
            onClick={() => handlePillClick(pill.key)}
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
