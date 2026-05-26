import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "yellow" | "red" | "sky" | "muted";
}

export default function Badge({ children, variant = "muted" }: BadgeProps) {
  let style = "text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center justify-center font-sans";

  switch (variant) {
    case "green":
      style += " bg-brand-greenLight text-brand-green dark:bg-brand-greenLight/15";
      break;
    case "yellow":
      style += " bg-brand-yellowLight text-brand-yellow dark:bg-brand-yellowLight/15";
      break;
    case "red":
      style += " bg-brand-redLight text-brand-red dark:bg-brand-redLight/15";
      break;
    case "sky":
      style += " bg-blue-50 text-brand-sky dark:bg-brand-sky/15";
      break;
    case "muted":
      style += " bg-surface-muted text-text-secondary dark:bg-dark-muted dark:text-text-secondary";
      break;
  }

  return <span className={style}>{children}</span>;
}
