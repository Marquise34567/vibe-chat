/**
 * MatchConnectionContext — shared WebSocket + WebRTC connection for matching.
 *
 * The connection must persist across the Match → ChatRoom navigation.
 * Previously, useMatchConnection was called inside Match.tsx, and when Match
 * unmounted (on navigate to /chat/:otherId) its cleanup destroyed the
 * RTCPeerConnection — so the remote video never connected in ChatRoom.
 *
 * By lifting the hook into a provider that wraps both routes, the WebSocket
 * and WebRTC connection survive the route change.
 */

import { createContext, useContext, ReactNode } from "react";
import { useMatchConnection } from "@/hooks/useMatchConnection";

type MatchConnectionValue = ReturnType<typeof useMatchConnection>;

const MatchConnectionContext = createContext<MatchConnectionValue | null>(null);

export const MatchConnectionProvider = ({ children }: { children: ReactNode }) => {
  const connection = useMatchConnection();
  return (
    <MatchConnectionContext.Provider value={connection}>
      {children}
    </MatchConnectionContext.Provider>
  );
};

export const useMatchConnectionContext = (): MatchConnectionValue => {
  const ctx = useContext(MatchConnectionContext);
  if (!ctx) {
    throw new Error("useMatchConnectionContext must be used within MatchConnectionProvider");
  }
  return ctx;
};
