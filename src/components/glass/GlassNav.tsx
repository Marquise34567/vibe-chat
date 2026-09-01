import { Link } from "react-router-dom";
import { Sparkles, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * GlassNav — top navigation bar in Liquid Glass.
 * Used on the marketing landing page.
 */
export const GlassNav = ({ className }: { className?: string }) => {
  const { user, signOut } = useAuth();
  return (
    <nav className={cn("sticky top-3 z-50 px-4", className)}>
      <div className="glass glass-strong mx-auto max-w-5xl flex items-center justify-between px-4 py-2.5 rounded-full">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">FaceFrenzy</span>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-muted-foreground">
          {user ? (
            <>
              <Link to="/" className="hover:text-foreground transition-colors">Open app</Link>
              <Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link>
            </>
          ) : (
            <>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#safety" className="hover:text-foreground transition-colors">Safety</a>
              <a href="#plus" className="hover:text-foreground transition-colors">Plus</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={signOut}
              className="btn-glass text-sm"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-semibold px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link to="/auth" className="btn-primary text-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
