import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { MatchConnectionProvider } from "@/contexts/MatchConnectionContext";
import { AppShell } from "@/components/AppShell";
import { AgeGate } from "@/components/AgeGate";
import { getAgeVerified } from "@/lib/verification";
import StartTab from "./pages/app/StartTab";
import ChatsTab from "./pages/app/ChatsTab";
import MomentsTab from "./pages/app/MomentsTab";
import CardsTab from "./pages/app/CardsTab";
import ProfileTab from "./pages/app/ProfileTab";
import Match from "./pages/Match";
import ChatRoom from "./pages/ChatRoom";
import Plus from "./pages/Plus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [ageOk, setAgeOk] = useState(getAgeVerified());

  useEffect(() => { setAgeOk(getAgeVerified()); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            {!ageOk && <AgeGate onDone={() => setAgeOk(true)} />}
            <Routes>
              {/* Lobby is the landing page — no separate welcome screen */}
              <Route path="/" element={<AppShell />}>
                <Route index element={<StartTab />} />
                <Route path="chats" element={<ChatsTab />} />
                <Route path="moments" element={<MomentsTab />} />
                <Route path="cards" element={<CardsTab />} />
                <Route path="profile" element={<ProfileTab />} />
              </Route>

              {/* Redirect old paths to root */}
              <Route path="/app" element={<Navigate to="/" replace />} />
              <Route path="/app/chats" element={<Navigate to="/chats" replace />} />
              <Route path="/app/moments" element={<Navigate to="/moments" replace />} />
              <Route path="/app/cards" element={<Navigate to="/cards" replace />} />
              <Route path="/app/profile" element={<Navigate to="/profile" replace />} />

              {/* Full-bleed flows (no tab bar) — share one match connection
                  so WebRTC survives the Match → ChatRoom navigation */}
              <Route element={<MatchConnectionProvider><Outlet /></MatchConnectionProvider>}>
                <Route path="/match" element={<Match />} />
                <Route path="/chat/:otherId" element={<ChatRoom />} />
              </Route>
              <Route path="/plus" element={<Plus />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
