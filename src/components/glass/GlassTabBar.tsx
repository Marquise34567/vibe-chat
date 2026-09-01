import { Link, useLocation } from "react-router-dom";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
};

/**
 * GlassTabBar — the iOS 26-style floating Liquid Glass tab bar.
 * Sits above content, refracts the mesh behind it, with a specular
 * highlight and a sliding active indicator.
 */
export const GlassTabBar = ({ items }: { items: TabItem[] }) => {
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pointer-events-auto">
        <nav className="neu-glass glass-strong rounded-full px-2 py-2 flex items-center justify-between">
          {items.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-full px-3 sm:px-4 py-1.5 transition-all duration-300 min-w-0 flex-1",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <span
                    className="absolute inset-0 rounded-full bg-primary/15 transition-all duration-300"
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center">
                  <Icon
                    className={cn(
                      "transition-transform duration-300",
                      active ? "scale-110" : "scale-100"
                    )}
                    strokeWidth={active ? 2.6 : 2}
                  />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "relative text-[10px] font-semibold tracking-tight transition-opacity duration-300",
                    active ? "opacity-100" : "opacity-80"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
