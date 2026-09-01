import { useState } from "react";
import { Gamepad2, X } from "lucide-react";
import { GlassCard, GlassSheet } from "@/components/glass";
import { UnoGame } from "./UnoGame";
import { PoolGame } from "./PoolGame";

type GameId = "uno" | "pool" | null;

export const GamePicker = () => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<GameId>(null);

  if (active === "uno") return <UnoGame onClose={() => setActive(null)} />;
  if (active === "pool") return <PoolGame onClose={() => setActive(null)} />;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-circle btn-circle-sm" aria-label="Play a game">
        <Gamepad2 className="w-5 h-5" strokeWidth={2.5} />
      </button>

      <GlassSheet open={open} onClose={() => setOpen(false)} title="Play a game">
        <p className="text-sm text-muted-foreground text-center mb-4">
          Break the ice with a mini-game while you chat.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setActive("uno"); setOpen(false); }}>
            <GlassCard className="p-5 flex flex-col items-center gap-2">
              <span className="text-4xl">🃏</span>
              <span className="font-bold">Uno</span>
              <span className="text-xs text-muted-foreground">Classic card game</span>
            </GlassCard>
          </button>
          <button onClick={() => { setActive("pool"); setOpen(false); }}>
            <GlassCard className="p-5 flex flex-col items-center gap-2">
              <span className="text-4xl">🎱</span>
              <span className="font-bold">8-Ball</span>
              <span className="text-xs text-muted-foreground">Pool mini-game</span>
            </GlassCard>
          </button>
        </div>
      </GlassSheet>
    </>
  );
};
