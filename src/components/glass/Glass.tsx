import { forwardRef, HTMLAttributes, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * GlassCard — a Liquid Glass surface for controls & navigation.
 * Per Apple's HIG, Liquid Glass floats above the content layer.
 * Includes a motion-responsive specular highlight (pointer-tracked).
 */
type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  strong?: boolean;
  pill?: boolean;
  /** Track pointer for live specular light play */
  interactive?: boolean;
  children?: ReactNode;
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ strong, pill, interactive = true, className, children, style, ...rest }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const setRefs = (el: HTMLDivElement | null) => {
      localRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = localRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--spec-x", `${x}%`);
      el.style.setProperty("--spec-y", `${y}%`);
    };

    return (
      <div
        ref={setRefs}
        onMouseMove={onMove}
        className={cn(
          "neu-glass",
          strong && "glass-strong",
          pill && "rounded-full",
          className
        )}
        style={
          {
            "--spec-x": "50%",
            "--spec-y": "0%",
            ...style,
          } as React.CSSProperties
        }
        {...rest}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

/** Content-layer surface (standard material, NOT liquid glass). */
export const Surface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { className?: string }>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("surface", className)} {...rest} />
  )
);
Surface.displayName = "Surface";
