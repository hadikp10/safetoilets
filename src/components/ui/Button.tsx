import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-border aria-invalid:ring-3 aria-invalid:ring-border/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-green text-text-inverse hover:bg-brand-greenDark border-brand-green",
        primary: "bg-brand-green text-text-inverse hover:bg-brand-greenDark border-brand-green",
        outline:
          "border-border bg-background hover:bg-secondary hover:text-text-primary aria-expanded:bg-secondary aria-expanded:text-text-primary",
        secondary:
          "bg-secondary text-text-primary border-border hover:bg-surface-border aria-expanded:bg-secondary aria-expanded:text-text-primary",
        ghost:
          "hover:bg-secondary hover:text-text-primary aria-expanded:bg-secondary aria-expanded:text-text-primary",
        destructive:
          "bg-secondary text-text-secondary border border-border hover:bg-surface-border focus-visible:border-border focus-visible:ring-border/20",
        danger:
          "bg-secondary text-text-secondary border border-border hover:bg-surface-border focus-visible:border-border focus-visible:ring-border/20",
        link: "text-brand-green underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  fullWidth?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  fullWidth,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        fullWidth && "w-full"
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export default Button
