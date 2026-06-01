import React from "react";
import { motion } from "framer-motion";

interface FilterPillsProps {
  activeFilters: string[];
  onChange: (filters: string[]) => void;
}

const PILLS = [
  { key: "all", label: "All" },
  { key: "twentyFourHours", label: "24 Hrs" },
  { key: "womenAccessible", label: "Women Accessible" },
  { key: "accessible", label: "Wheelchair" },
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
    <div className="w-full overflow-x-auto no-scrollbar py-2.5 px-4 flex gap-1.5 whitespace-nowrap bg-surface-bg dark:bg-dark-bg border-b border-surface-border dark:border-dark-border">
      {PILLS.map((pill) => {
        const isActive = activeFilters.includes(pill.key);
        return (
          <motion.button
            key={pill.key}
            onClick={() => handlePillClick(pill.key)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={`h-9 px-4 rounded-full text-xs font-semibold border-none outline-none select-none flex items-center justify-center transition-colors duration-150 ${
              isActive
                ? "bg-brand-green text-text-inverse shadow-sm"
                : "bg-surface-muted text-text-secondary dark:bg-dark-muted dark:text-text-secondary hover:bg-surface-border dark:hover:bg-dark-border"
            }`}
          >
            {pill.label}
          </motion.button>
        );
      })}
    </div>
  );
}
