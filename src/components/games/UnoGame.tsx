import { useState, useEffect } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GlassCard, GlassButton } from "@/components/glass";
import {
  startUno, playCard, drawCard, opponentPlay,
  canPlay, unoColorHex, type UnoState, type UnoColor,
} from "@/lib/games/uno";

const COLOR_LABELS: Record<UnoColor, string> = {
  red: "Red", yellow: "Yellow", green: "Green", blue: "Blue", wild: "Wild",
};

export const UnoGame = ({ onClose }: { onClose: () => void }) => {
  const [state, setState] = useState<UnoState>(() => startUno());
  const [chosenColor, setChosenColor] = useState<UnoColor | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // AI opponent auto-plays
  useEffect(() => {
    if (state.turn === "them" && !state.winner) {
      const t = setTimeout(() => setState(opponentPlay(state)), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  const handlePlay = (cardId: string) => {
    const card = state.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.color === "wild") {
      setShowColorPicker(true);
      // Wait for color selection
      return;
    }
    setState(playCard(state, cardId));
  };

  const handleColorPick = (color: UnoColor) => {
    setChosenColor(color);
    setShowColorPicker(false);
    // Find the wild card and play it
    const wildCard = state.hand.find((c) => c.color === "wild");
    if (wildCard) setState(playCard(state, wildCard.id, color));
  };

  const restart = () => {
    setState(startUno());
    setChosenColor(null);
    setShowColorPicker(false);
  };

  return (
    <GlassCard strong className="p-4" interactive={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <span className="font-bold">Uno</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge">Opponent: {state.opponentHandCount}</span>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      </div>

      {/* Status */}
      <div className={`text-center text-sm font-semibold mb-3 py-2 rounded-xl ${
        state.winner === "me" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
        state.winner === "them" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
        "bg-muted/50"
      }`}>
        {state.message}
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex justify-center gap-1 mb-3 min-h-[40px]">
        {Array.from({ length: Math.min(state.opponentHandCount, 10) }).map((_, i) => (
          <div key={i} className="w-7 h-10 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 border border-white/20 shadow" />
        ))}
      </div>

      {/* Discard pile + draw pile */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {/* Draw pile */}
        <button
          onClick={() => state.turn === "me" && !state.winner && setState(drawCard(state))}
          disabled={state.turn !== "me" || !!state.winner}
          className="w-14 h-20 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 border-2 border-white/20 shadow-lg flex items-center justify-center text-white font-bold text-xs disabled:opacity-40"
        >
          DRAW
        </button>

        {/* Current color indicator */}
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Color</div>
          <div
            className="w-8 h-8 rounded-full border-2 border-white/30 shadow"
            style={{ background: unoColorHex(state.currentColor) }}
          />
        </div>

        {/* Discard pile (top card) */}
        <div
          className="w-14 h-20 rounded-xl border-2 border-white/30 shadow-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ background: unoColorHex(state.top.color === "wild" ? "wild" : state.top.color) }}
        >
          {state.top.value === "skip" ? "⊘" :
           state.top.value === "reverse" ? "⇄" :
           state.top.value === "draw2" ? "+2" :
           state.top.value === "wild" ? "🎨" :
           state.top.value === "wild4" ? "+4" :
           state.top.value}
        </div>
      </div>

      {/* Color picker for wild cards */}
      {showColorPicker && (
        <div className="flex justify-center gap-2 mb-3">
          {(["red", "yellow", "green", "blue"] as UnoColor[]).map((c) => (
            <button
              key={c}
              onClick={() => handleColorPick(c)}
              className="w-10 h-10 rounded-full border-2 border-white/30 shadow hover:scale-110 transition-transform"
              style={{ background: unoColorHex(c) }}
              aria-label={COLOR_LABELS[c]}
            />
          ))}
        </div>
      )}

      {/* My hand */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {state.hand.map((card) => {
          const playable = canPlay(card, state.top, state.currentColor) && state.turn === "me" && !state.winner;
          return (
            <button
              key={card.id}
              onClick={() => playable && handlePlay(card.id)}
              disabled={!playable}
              className={`w-12 h-16 rounded-lg border-2 flex items-center justify-center text-white font-bold text-sm shadow transition-all ${
                playable ? "border-white/40 hover:scale-110 hover:-translate-y-2 cursor-pointer" : "border-white/10 opacity-50"
              }`}
              style={{ background: unoColorHex(card.color) }}
            >
              {card.value === "skip" ? "⊘" :
               card.value === "reverse" ? "⇄" :
               card.value === "draw2" ? "+2" :
               card.value === "wild" ? "🎨" :
               card.value === "wild4" ? "+4" :
               card.value}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {state.winner ? (
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-highlight" strokeWidth={2.5} />
          <button onClick={restart} className="btn-glass text-sm py-2 px-4">
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} /> Play again
          </button>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground">
          {state.turn === "me" ? "Your turn — tap a playable card" : "Opponent thinking…"}
        </div>
      )}
    </GlassCard>
  );
};
