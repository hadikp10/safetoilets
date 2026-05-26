import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  let baseStyle = "flex items-center justify-center font-semibold text-sm rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] px-4 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  if (fullWidth) {
    baseStyle += " w-full";
  }

  let variantStyle = "";
  switch (variant) {
    case "primary":
      variantStyle = "bg-brand-green text-text-inverse hover:bg-opacity-90 shadow-sm";
      break;
    case "secondary":
      variantStyle = "bg-surface-muted text-text-primary border border-surface-border hover:bg-surface-border dark:bg-dark-muted dark:text-text-inverse dark:border-dark-border dark:hover:bg-dark-card";
      break;
    case "ghost":
      variantStyle = "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-muted dark:text-text-secondary dark:hover:text-text-inverse dark:hover:bg-dark-muted";
      break;
    case "danger":
      variantStyle = "bg-brand-red text-text-inverse hover:bg-opacity-90";
      break;
    case "outline":
      variantStyle = "border-2 border-brand-green text-brand-green bg-transparent hover:bg-brand-greenLight dark:hover:bg-brand-green/20";
      break;
  }

  return (
    <button className={`${baseStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}
