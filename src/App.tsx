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
import OmegleAlternative from "./pages/seo/OmegleAlternative";
import TalkToStrangers from "./pages/seo/TalkToStrangers";
import Safety from "./pages/seo/Safety";
import { VSOmeTV, VSEmeraldChat, VSChatroulette, VSMonkey, VSBazoocam, VSChatspin, VSChatrandom, VSShagle, VSCamSurf, VSJoingy } from "./pages/seo/vs/VSPages";
import IsOmegleBack from "./pages/blog/IsOmegleBack";
import WhatHappenedToOmegle from "./pages/blog/WhatHappenedToOmegle";
import BestRandomVideoChat2026 from "./pages/blog/BestRandomVideoChat2026";
import HowToStaySafe from "./pages/blog/HowToStaySafe";
import OmegleAlternativeNoSignup from "./pages/blog/OmegleAlternativeNoSignup";
import FreeOmegleAlternative from "./pages/seo/FreeOmegleAlternative";
import AnonymousVideoChat from "./pages/seo/AnonymousVideoChat";
import RandomCamChat from "./pages/seo/RandomCamChat";
import OneOnOneVideoChat from "./pages/seo/OneOnOneVideoChat";

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

              {/* SEO / landing pages */}
              <Route path="/omegle-alternative" element={<OmegleAlternative />} />
              <Route path="/talk-to-strangers" element={<TalkToStrangers />} />
              <Route path="/safety" element={<Safety />} />
              <Route path="/vs/ometv" element={<VSOmeTV />} />
              <Route path="/vs/emerald-chat" element={<VSEmeraldChat />} />
              <Route path="/vs/chatroulette" element={<VSChatroulette />} />
              <Route path="/vs/monkey" element={<VSMonkey />} />
              <Route path="/vs/bazoocam" element={<VSBazoocam />} />
              <Route path="/vs/chatspin" element={<VSChatspin />} />
              <Route path="/vs/chatrandom" element={<VSChatrandom />} />
              <Route path="/vs/shagle" element={<VSShagle />} />
              <Route path="/vs/camsurf" element={<VSCamSurf />} />
              <Route path="/vs/joingy" element={<VSJoingy />} />
              <Route path="/blog/is-omegle-back" element={<IsOmegleBack />} />
              <Route path="/blog/what-happened-to-omegle" element={<WhatHappenedToOmegle />} />
              <Route path="/blog/best-random-video-chat-2026" element={<BestRandomVideoChat2026 />} />
              <Route path="/blog/how-to-stay-safe" element={<HowToStaySafe />} />
              <Route path="/blog/omegle-alternative-no-signup" element={<OmegleAlternativeNoSignup />} />
              <Route path="/free-omegle-alternative" element={<FreeOmegleAlternative />} />
              <Route path="/anonymous-video-chat" element={<AnonymousVideoChat />} />
              <Route path="/random-cam-chat" element={<RandomCamChat />} />
              <Route path="/1v1-video-chat" element={<OneOnOneVideoChat />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
