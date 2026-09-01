import { Outlet, useLocation } from "react-router-dom";
import { GlassTabBar, type TabItem } from "@/components/glass";
import { usePresence } from "@/hooks/usePresence";
import {
  VideoIcon as Video, MessageIcon as MessageCircle,
  SparkleIcon as Sparkles, LayersIcon as Layers, UserIcon as User,
} from "@/components/FaceFrenzyIcons";

const TABS: TabItem[] = [
  { to: "/", label: "Start", icon: Video },
  { to: "/chats", label: "Chats", icon: MessageCircle, badge: 6 },
  { to: "/moments", label: "Moments", icon: Sparkles },
  { to: "/cards", label: "Cards", icon: Layers },
  { to: "/profile", label: "Profile", icon: User },
];

/**
 * AppShell — wraps all routes. Heartbeats presence.
 * Tab bar is hidden on the lobby (index "/") — it's a full-bleed dark stage.
 */
export const AppShell = () => {
  usePresence();
  const { pathname } = useLocation();
  const isLobby = pathname === "/";

  return (
    <div className={isLobby ? "" : "bg-app"}>
      <main className={isLobby ? "" : "pb-28 min-h-screen-safe"}>
        <Outlet />
      </main>
      {!isLobby && <GlassTabBar items={TABS} />}
    </div>
  );
};
