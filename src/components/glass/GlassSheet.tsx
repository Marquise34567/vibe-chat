import { useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GlassSheet — a Liquid Glass bottom sheet (modal).
 * Slides up with a spring curve, dims the background, dismissible.
 */
export const GlassSheet = ({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "glass glass-strong animate-sheet-up w-full max-w-md mx-auto rounded-b-none rounded-t-glass-lg p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-foreground/20 -mt-1 mb-2" />
        </div>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="btn-circle btn-circle-sm text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
