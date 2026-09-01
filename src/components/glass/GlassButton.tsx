import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children?: ReactNode;
};

const sizeMap: Record<Size, string> = {
  sm: "text-sm px-4 py-2",
  md: "text-base px-5 py-3",
  lg: "text-lg px-7 py-4",
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = "glass", size = "md", full, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-transform duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        sizeMap[size],
        full && "w-full",
        variant === "primary" && "btn-primary",
        variant === "glass" && "btn-glass",
        variant === "ghost" && "text-foreground/80 hover:text-foreground hover:bg-foreground/5 rounded-full",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
GlassButton.displayName = "GlassButton";

type CircleProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
  active?: boolean;
  children?: ReactNode;
};

export const GlassCircleButton = forwardRef<HTMLButtonElement, CircleProps>(
  ({ size = "md", active, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "btn-circle",
        size === "sm" && "btn-circle-sm",
        size === "lg" && "btn-circle-lg",
        active && "glass-active",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
GlassCircleButton.displayName = "GlassCircleButton";
