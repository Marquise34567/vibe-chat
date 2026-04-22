import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mic, Video, SkipForward, Heart, Flag, ArrowLeft, MicOff, VideoOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { countryByCode } from "@/lib/countries";
import { toast } from "sonner";

type Profile = {
  id: string;
  display_name: string | null;
  gender: string | null;
  country: string | null;
  interests: string[] | null;
};

const ChatRoom = () => {
  const { otherId } = useParams<{ otherId: string }>();
  const navigate = useNavigate();
  const [other, setOther] = useState<Profile | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  useEffect(() => {
    if (!otherId) return;
    supabase
      .from("profiles")
      .select("id, display_name, gender, country, interests")
      .eq("id", otherId)
      .maybeSingle()
      .then(({ data }) => setOther(data as Profile | null));
  }, [otherId]);

  const c = countryByCode(other?.country);

  return (
    <div className="min-h-screen px-4 md:px-8 py-6">
      <button
        onClick={() => navigate("/lobby")}
        className="font-display font-bold text-sm flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={3} /> back to lobby
      </button>

      <div className="max-w-5xl mx-auto">
        <div className="glass brutal-lg rounded-3xl p-4 md:p-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Their tile */}
            <div className="bg-primary aspect-video rounded-2xl border-2 border-foreground brutal relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
              <span className="font-display font-bold text-8xl text-foreground/80">
                {(other?.display_name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="absolute top-3 left-3 sticker bg-destructive text-destructive-foreground text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-background mr-1 animate-pulse" />
                LIVE
              </div>
              {c && <div className="absolute top-3 right-3 text-3xl">{c.flag}</div>}
              <div className="absolute bottom-3 left-3 text-background">
                <div className="font-display font-bold text-2xl">{other?.display_name ?? "..."}</div>
                <div className="text-sm font-semibold opacity-80">{other?.gender ?? ""}</div>
              </div>
            </div>

            {/* Your tile (placeholder) */}
            <div className="bg-accent aspect-video rounded-2xl border-2 border-foreground brutal relative overflow-hidden flex items-center justify-center">
              <span className="font-display font-bold text-3xl text-accent-foreground text-center px-4">
                {camOff ? "📷 cam off" : "📹 your camera"}
              </span>
              <div className="absolute bottom-3 left-3 sticker text-xs">you</div>
            </div>
          </div>

          {/* Controls */}
          <div className="glass-dark rounded-2xl p-3 flex items-center justify-center gap-3">
            <CtrlBtn onClick={() => setMuted((m) => !m)} active={muted}>
              {muted ? <MicOff className="w-5 h-5" strokeWidth={3} /> : <Mic className="w-5 h-5" strokeWidth={3} />}
            </CtrlBtn>
            <CtrlBtn onClick={() => setCamOff((v) => !v)} active={camOff}>
              {camOff ? <VideoOff className="w-5 h-5" strokeWidth={3} /> : <Video className="w-5 h-5" strokeWidth={3} />}
            </CtrlBtn>
            <CtrlBtn onClick={() => toast("added to favs ❤️")} primary>
              <Heart className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>
            <CtrlBtn onClick={() => navigate("/lobby")}>
              <SkipForward className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>
            <CtrlBtn onClick={() => toast("reported. thanks for keeping VIBEZ safe.")}>
              <Flag className="w-5 h-5" strokeWidth={3} />
            </CtrlBtn>
          </div>

          <div className="mt-4 text-center text-sm font-body text-muted-foreground">
            🎥 Real video streaming needs LiveKit or Agora — wire one up next!
          </div>
        </div>
      </div>
    </div>
  );
};

const CtrlBtn = ({
  onClick,
  children,
  primary,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-background flex items-center justify-center hover:scale-110 transition-transform ${
      active ? "bg-destructive text-destructive-foreground" : primary ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
    }`}
  >
    {children}
  </button>
);

export default ChatRoom;
