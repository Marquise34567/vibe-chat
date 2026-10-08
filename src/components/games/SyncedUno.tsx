import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GlassCard } from "@/components/glass";
import {
  startUnoFull, applyUnoMove, unoViewFor, otherSideOf,
  canPlay, unoColorHex,
  type UnoFullState, type UnoMove, type UnoSide, type UnoColor,
} from "@/lib/games/uno";

const COLOR_LABELS: Record<UnoColor, string> = {
  red: "Red", yellow: "Yellow", green: "Green", blue: "Blue", wild: "Wild",
};

/**
 * SyncedUno — 2-player Uno against the actual match partner.
 * Host-authoritative: the host peer runs applyUnoMove for both sides and
 * broadcasts the full state; the guest sends moves and renders what it gets.
 */
export const SyncedUno = ({
  mySide,
  isHost,
  partnerName,
  send,
  incoming,
}: {
  mySide: UnoSide;
  isHost: boolean;
  partnerName: string;
  send: (payload: any) => boolean;
  incoming: any; // latest game message for this game (kind: uno-*)
}) => {
  const [full, setFull] = useState<UnoFullState | null>(null);
  const [pendingWild, setPendingWild] = useState<string | null>(null);

  // Host deals on mount; guest waits for the first state broadcast.
  useEffect(() => {
    if (!isHost) return;
    const s = startUnoFull();
    setFull(s);
    send({ kind: "uno-state", state: s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  const applyAndBroadcast = useCallback(
    (fn: (s: UnoFullState) => UnoFullState) => {
      setFull((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        if (next !== prev) send({ kind: "uno-state", state: next });
        return next;
      });
    },
    [send]
  );

  // Inbound protocol
  useEffect(() => {
    if (!incoming) return;
    if (incoming.kind === "uno-state" && !isHost) {
      setFull(incoming.state);
    } else if (incoming.kind === "uno-move" && isHost) {
      // Guest's move — apply on their side and broadcast the result
      applyAndBroadcast((s) => applyUnoMove(s, otherSideOf(mySide), incoming.move as UnoMove));
    } else if (incoming.kind === "uno-rematch" && isHost) {
      const s = startUnoFull();
      setFull(s);
      send({ kind: "uno-state", state: s });
    }
  }, [incoming, isHost, mySide, applyAndBroadcast, send]);

  const doMove = useCallback(
    (move: UnoMove) => {
      if (isHost) {
        applyAndBroadcast((s) => applyUnoMove(s, mySide, move));
      } else {
        // Guest: send the move to the host; state comes back via uno-state
        send({ kind: "uno-move", move });
      }
    },
    [isHost, mySide, applyAndBroadcast, send]
  );

  const view = full ? unoViewFor(full, mySide) : null;

  const handlePlay = (cardId: string) => {
    if (!view || view.turn !== "me" || view.winner) return;
    const card = view.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.color === "wild") {
      setPendingWild(cardId);
      return;
    }
    doMove({ type: "play", cardId });
  };

  const handleColorPick = (color: UnoColor) => {
    if (!pendingWild) return;
    doMove({ type: "play", cardId: pendingWild, color });
    setPendingWild(null);
  };

  const rematch = () => {
    if (isHost) {
      const s = startUnoFull();
      setFull(s);
      send({ kind: "uno-state", state: s });
    } else {
      send({ kind: "uno-rematch" });
    }
  };

  if (!view) {
    return (
      <GlassCard strong className="p-4" interactive={false}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🃏</span>
          <span className="font-bold">Uno vs {partnerName}</span>
        </div>
        <div className="text-center text-sm text-muted-foreground py-8 animate-pulse">
          Dealing cards…
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard strong className="p-4" interactive={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🃏</span>
          <span className="font-bold">Uno vs {partnerName}</span>
        </div>
        <span className="badge">{partnerName}: {view.opponentHandCount} cards</span>
      </div>

      {/* Status */}
      <div className={`text-center text-sm font-semibold mb-3 py-2 rounded-xl ${
        view.winner === "me" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
        view.winner === "them" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
        "bg-muted/50"
      }`}>
        {view.winner === "me" ? "🎉 You won!" : view.winner === "them" ? `😢 ${partnerName} won!` : view.message}
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex justify-center gap-1 mb-3 min-h-[40px]">
        {Array.from({ length: Math.min(view.opponentHandCount, 10) }).map((_, i) => (
          <div key={i} className="w-7 h-10 rounded-md bg-gradient-to-br from-violet-600 to-fuchsia-600 border border-white/20 shadow" />
        ))}
        {view.opponentHandCount > 10 && (
          <span className="text-xs text-muted-foreground self-center">+{view.opponentHandCount - 10}</span>
        )}
      </div>

      {/* Discard pile + draw pile */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <button
          onClick={() => view.turn === "me" && !view.winner && doMove({ type: "draw" })}
          disabled={view.turn !== "me" || !!view.winner}
          className="w-14 h-20 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 border-2 border-white/20 shadow-lg flex items-center justify-center text-white font-bold text-xs disabled:opacity-40"
        >
          DRAW
        </button>

        <div className="text-center">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Color</div>
          <div
            className="w-8 h-8 rounded-full border-2 border-white/30 shadow"
            style={{ background: unoColorHex(view.currentColor) }}
          />
        </div>

        <div
          className="w-14 h-20 rounded-xl border-2 border-white/30 shadow-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ background: unoColorHex(view.top.color === "wild" ? "wild" : view.top.color) }}
        >
          {view.top.value === "skip" ? "⊘" :
           view.top.value === "reverse" ? "⇄" :
           view.top.value === "draw2" ? "+2" :
           view.top.value === "wild" ? "🎨" :
           view.top.value === "wild4" ? "+4" :
           view.top.value}
        </div>
      </div>

      {/* Color picker for wild cards */}
      {pendingWild && (
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
      <div className="flex flex-wrap justify-center gap-1.5 mb-3 max-h-40 overflow-y-auto">
        {view.hand.map((card) => {
          const playable = canPlay(card, view.top, view.currentColor) && view.turn === "me" && !view.winner;
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
      {view.winner ? (
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-highlight" strokeWidth={2.5} />
          <button onClick={rematch} className="btn-glass text-sm py-2 px-4">
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} /> Play again
          </button>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground">
          {view.turn === "me" ? "Your turn — tap a playable card" : `${partnerName}'s turn…`}
        </div>
      )}
    </GlassCard>
  );
};
