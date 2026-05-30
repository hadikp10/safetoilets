import React from "react";
import { motion } from "framer-motion";

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
    <div className="w-full overflow-x-auto scrollbar-hide py-2 px-4 flex gap-1 whitespace-nowrap bg-white border-b border-neutral-200">
      {PILLS.map((pill) => {
        const isActive = activeFilters.includes(pill.key);
        return (
          <motion.button
            key={pill.key}
            onClick={() => handlePillClick(pill.key)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.08 }}
            className={`h-[30px] px-3 rounded-full text-[11px] font-medium tracking-wide uppercase border-none outline-none select-none flex items-center justify-center ${
              isActive
                ? "bg-brand-greenLight text-brand-greenText"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {pill.label}
          </motion.button>
        );
      })}
    </div>
  );
}
