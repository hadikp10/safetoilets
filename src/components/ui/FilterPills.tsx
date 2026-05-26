import React from "react";

interface FilterPillsProps {
  activeFilter: string;
  onChange: (filter: string) => void;
}

const PILLS = [
  { key: "all", label: "All" },
  { key: "clean", label: "Clean ✓" },
  { key: "womenSafe", label: "Women Safe" },
  { key: "accessible", label: "Accessible ♿" },
  { key: "twentyFourHours", label: "24 Hours" },
];

export default function FilterPills({ activeFilter, onChange }: FilterPillsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 px-4 flex gap-2 whitespace-nowrap bg-surface-bg dark:bg-dark-bg border-b border-surface-border dark:border-dark-border">
      {PILLS.map((pill) => {
        const isActive = activeFilter === pill.key;
        return (
          <button
            key={pill.key}
            onClick={() => onChange(pill.key)}
            className={`h-11 px-4 flex items-center justify-center text-sm font-medium rounded-full min-w-[44px] transition-all active:scale-95 ${
              isActive
                ? "bg-brand-green text-text-inverse"
                : "bg-surface-muted text-text-secondary hover:text-text-primary dark:bg-dark-muted dark:text-text-secondary dark:hover:text-text-inverse"
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
