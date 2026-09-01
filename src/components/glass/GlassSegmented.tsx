import { cn } from "@/lib/utils";

type Option = { value: string; label: string; icon?: React.ReactNode };

/**
 * GlassSegmented — iOS-style segmented control rendered in Liquid Glass.
 */
export const GlassSegmented = <T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Option[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) => (
  <div className={cn("glass-pill p-1 flex items-center gap-1", className)}>
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value as T)}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-300",
            active
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      );
    })}
  </div>
);
