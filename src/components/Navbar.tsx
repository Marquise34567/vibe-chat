import { Sparkles, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-4 z-50 mx-4 md:mx-8">
      <div className="glass brutal rounded-2xl flex items-center justify-between px-4 md:px-6 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-primary border-2 border-foreground brutal-sm flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </div>
          <span className="font-display font-bold text-xl md:text-2xl">FaceFrenzy</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 font-display font-semibold">
          {user ? (
            <>
              <Link to="/lobby" className="hover:text-primary transition-colors">Lobby</Link>
              <Link to="/profile" className="hover:text-primary transition-colors">Profile</Link>
            </>
          ) : (
            <>
              <a href="#how" className="hover:text-primary transition-colors">How it works</a>
              <a href="#plans" className="hover:text-primary transition-colors">Plans</a>
              <a href="#countries" className="hover:text-primary transition-colors">Countries</a>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="hidden sm:inline font-display font-bold text-sm hover:underline">
                hey {user.user_metadata?.display_name || user.email?.split("@")[0]} ✨
              </Link>
              <button
                onClick={signOut}
                className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-3 py-2 font-display font-bold text-sm flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" strokeWidth={3} /> out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:inline-flex font-display font-bold text-sm px-3 py-2 hover:underline underline-offset-4">Log in</Link>
              <Link to="/auth" className="brutal-hover bg-foreground text-background border-2 border-foreground rounded-xl px-4 py-2 font-display font-bold text-sm">
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
