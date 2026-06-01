import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "yellow" | "red" | "sky" | "muted";
}

export default function Badge({ children, variant = "muted" }: BadgeProps) {
  let style = "text-xs font-medium px-2.5 py-0.5 rounded-full inline-flex items-center justify-center font-sans";

  switch (variant) {
    case "green":
      style += " bg-brand-greenLight text-brand-greenDark";
      break;
    case "yellow":
      style += " bg-brand-greenVeryLight text-brand-greenDark border border-brand-green/10";
      break;
    case "red":
      style += " bg-surface-muted text-text-primary border border-surface-border";
      break;
    case "sky":
      style += " bg-brand-greenVeryLight text-brand-green";
      break;
    case "muted":
      style += " bg-surface-muted text-text-secondary";
      break;
  }

  return <span className={style}>{children}</span>;
}
