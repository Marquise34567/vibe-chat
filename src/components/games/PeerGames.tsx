import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Trophy, RotateCcw } from "lucide-react";
import { GlassCard, GlassCircleButton } from "@/components/glass";
import { GamepadIcon as Gamepad2 } from "@/components/FaceFrenzyIcons";
import { useMatchConnectionContext } from "@/contexts/MatchConnectionContext";
import { SyncedUno } from "./SyncedUno";
import type { UnoSide } from "@/lib/games/uno";

type GameId = "uno" | "ttt" | "wyr";

const GAME_META: Record<GameId, { emoji: string; name: string; blurb: string }> = {
  uno: { emoji: "🃏", name: "Uno", blurb: "Classic card battle" },
  ttt: { emoji: "❌", name: "Tic-Tac-Toe", blurb: "Quick and ruthless" },
  wyr: { emoji: "🤔", name: "Would You Rather", blurb: "Icebreaker questions" },
};

/**
 * PeerGames — in-call games played against the actual match partner.
 *
 * Transport: WebRTC data channel (falls back to the match server's
 * "game-relay" message). Protocol is invite → accept → play → quit;
 * the WebRTC *caller* is always the authoritative host (side "a").
 */
export const PeerGames = ({ triggerStyle }: { triggerStyle?: React.CSSProperties }) => {
  const { sendPeerMessage, onPeerMessage, peerRole, peerName, state: connState } = useMatchConnectionContext();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"menu" | "waiting" | "playing">("menu");
  const [game, setGame] = useState<GameId | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<GameId | null>(null);
  const [gameMsg, setGameMsg] = useState<any>(null); // latest non-control game message

  const isHost = peerRole === "caller";
  const mySide: UnoSide = isHost ? "a" : "b";
  const partnerName = peerName ?? "Partner";
  // Bumped on each rematch request so the active game remounts fresh
  const [session, setSession] = useState(0);

  // ── Control messages (invite/accept/decline/quit). Everything else is
  // forwarded to the active game via `gameMsg`. ──
  useEffect(() => {
    return onPeerMessage((m) => {
      if (!m || typeof m.kind !== "string") return;
      switch (m.kind) {
        case "game-invite":
          setIncomingInvite(m.game as GameId);
          break;
        case "game-accept":
          setGame(m.game as GameId);
          setPhase("playing");
          setIncomingInvite(null);
          setOpen(true);
          setSession((s) => s + 1);
          break;
        case "game-decline":
          setPhase("menu");
          setGame(null);
          toast(`${partnerName} isn't up for a game right now`);
          break;
        case "game-quit":
          setGame(null);
          setPhase("menu");
          toast(`${partnerName} left the game`);
          break;
        default:
          setGameMsg(m);
      }
    });
  }, [onPeerMessage, partnerName]);

  // Partner left the call entirely — close everything
  useEffect(() => {
    if (connState === "disconnected" || connState === "idle") {
      setOpen(false);
      setPhase("menu");
      setGame(null);
      setIncomingInvite(null);
    }
  }, [connState]);

  const invite = (g: GameId) => {
    if (!sendPeerMessage({ kind: "game-invite", game: g })) {
      toast.error("Not connected to your partner yet");
      return;
    }
    setGame(g);
    setPhase("waiting");
  };

  const cancelInvite = () => {
    sendPeerMessage({ kind: "game-decline" });
    setPhase("menu");
    setGame(null);
  };

  const acceptInvite = () => {
    if (!incomingInvite) return;
    sendPeerMessage({ kind: "game-accept", game: incomingInvite });
    setGame(incomingInvite);
    setIncomingInvite(null);
    setPhase("playing");
    setOpen(true);
    setSession((s) => s + 1);
  };

  const declineInvite = () => {
    sendPeerMessage({ kind: "game-decline" });
    setIncomingInvite(null);
  };

  const quitGame = () => {
    sendPeerMessage({ kind: "game-quit" });
    setGame(null);
    setPhase("menu");
  };

  return (
    <>
      {/* Trigger — sits in the call controls row */}
      <GlassCircleButton onClick={() => setOpen(true)} aria-label="Play a game" style={triggerStyle}>
        <Gamepad2 className="w-5 h-5" strokeWidth={2.5} />
      </GlassCircleButton>

      {/* Incoming invite modal — shows even while the panel is closed */}
      {incomingInvite && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6" style={{ animation: "ff-slide-up 0.3s ease" }}>
          <GlassCard strong className="p-6 w-full max-w-xs flex flex-col items-center gap-4 text-center" interactive={false}>
            <span className="text-5xl">{GAME_META[incomingInvite]?.emoji ?? "🎮"}</span>
            <div>
              <h3 className="text-lg font-extrabold text-white mb-1">
                {partnerName} wants to play {GAME_META[incomingInvite]?.name ?? "a game"}!
              </h3>
              <p className="text-sm text-white/50">Keep chatting while you play.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={declineInvite}
                className="flex-1 h-11 rounded-full bg-white/10 border border-white/10 text-white/60 font-bold text-sm"
              >
                Nah
              </button>
              <button
                onClick={acceptInvite}
                className="flex-1 h-11 rounded-full font-extrabold text-sm text-[#0A0A0F]"
                style={{ background: "linear-gradient(180deg, #FFE45E, #F5D000)", boxShadow: "0 6px 20px rgba(245,208,0,0.3)" }}
              >
                Let's go!
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Games overlay — covers the video stage, call audio keeps running */}
      {open && (
        <div
          className="fixed inset-0 z-[350] flex flex-col bg-black/70 backdrop-blur-md"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)", animation: "ff-slide-up 0.25s ease" }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-highlight" strokeWidth={2.5} />
              <span className="font-extrabold text-white">Games with {partnerName}</span>
            </div>
            <div className="flex items-center gap-2">
              {phase === "playing" && (
                <button onClick={quitGame} className="text-xs font-semibold text-white/50 px-3 py-1.5 rounded-full bg-white/10">
                  End game
                </button>
              )}
              <GlassCircleButton onClick={() => setOpen(false)} size="sm" aria-label="Back to chat">
                <X className="w-4 h-4" strokeWidth={2.5} />
              </GlassCircleButton>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 w-full max-w-md mx-auto">
            {phase === "menu" && (
              <>
                <p className="text-sm text-white/50 text-center mb-4">
                  Break the ice — play together while you chat.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(GAME_META) as GameId[]).map((g) => (
                    <button key={g} onClick={() => invite(g)}>
                      <GlassCard className="p-5 flex flex-col items-center gap-2">
                        <span className="text-4xl">{GAME_META[g].emoji}</span>
                        <span className="font-bold">{GAME_META[g].name}</span>
                        <span className="text-xs text-muted-foreground">{GAME_META[g].blurb}</span>
                      </GlassCard>
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === "waiting" && game && (
              <GlassCard strong className="p-8 flex flex-col items-center gap-4 text-center" interactive={false}>
                <span className="text-5xl animate-float">{GAME_META[game].emoji}</span>
                <div>
                  <h3 className="font-extrabold text-white mb-1">Invite sent!</h3>
                  <p className="text-sm text-white/50">Waiting for {partnerName} to accept…</p>
                </div>
                <button onClick={cancelInvite} className="text-xs font-semibold text-white/50 px-4 py-2 rounded-full bg-white/10">
                  Cancel invite
                </button>
              </GlassCard>
            )}

            {phase === "playing" && game === "uno" && (
              <SyncedUno key={session} mySide={mySide} isHost={isHost} partnerName={partnerName} send={sendPeerMessage} incoming={gameMsg} />
            )}
            {phase === "playing" && game === "ttt" && (
              <SyncedTicTacToe key={session} mySide={mySide} isHost={isHost} partnerName={partnerName} send={sendPeerMessage} incoming={gameMsg} />
            )}
            {phase === "playing" && game === "wyr" && (
              <SyncedWouldYouRather key={session} partnerName={partnerName} send={sendPeerMessage} incoming={gameMsg} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   Tic-Tac-Toe — host-authoritative, host is X.
   ════════════════════════════════════════════════════════════════ */

type TttState = {
  board: ("x" | "o" | null)[];
  turn: "a" | "b";
  winner: "a" | "b" | "draw" | null;
  line: number[] | null;
};

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const tttStart = (): TttState => ({ board: Array(9).fill(null), turn: "a", winner: null, line: null });

const tttApply = (s: TttState, side: "a" | "b", i: number): TttState => {
  if (s.winner || s.turn !== side || s.board[i]) return s;
  const board = [...s.board];
  board[i] = side === "a" ? "x" : "o";
  const line = TTT_LINES.find(([x, y, z]) => board[x] && board[x] === board[y] && board[y] === board[z]) ?? null;
  const winner = line ? side : board.every(Boolean) ? "draw" : null;
  return { board, turn: side === "a" ? "b" : "a", winner, line };
};

const SyncedTicTacToe = ({
  mySide, isHost, partnerName, send, incoming,
}: {
  mySide: "a" | "b"; isHost: boolean; partnerName: string;
  send: (p: any) => boolean; incoming: any;
}) => {
  const [state, setState] = useState<TttState | null>(null);

  useEffect(() => {
    if (!isHost) return;
    const s = tttStart();
    setState(s);
    send({ kind: "ttt-state", state: s });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  useEffect(() => {
    if (!incoming) return;
    if (incoming.kind === "ttt-state" && !isHost) setState(incoming.state);
    else if (incoming.kind === "ttt-move" && isHost) {
      setState((prev) => {
        if (!prev) return prev;
        const next = tttApply(prev, mySide === "a" ? "b" : "a", incoming.i);
        if (next !== prev) send({ kind: "ttt-state", state: next });
        return next;
      });
    } else if (incoming.kind === "ttt-rematch" && isHost) {
      const s = tttStart();
      setState(s);
      send({ kind: "ttt-state", state: s });
    }
  }, [incoming, isHost, mySide, send]);

  const play = (i: number) => {
    if (!state || state.winner || state.turn !== mySide || state.board[i]) return;
    if (isHost) {
      setState((prev) => {
        if (!prev) return prev;
        const next = tttApply(prev, mySide, i);
        if (next !== prev) send({ kind: "ttt-state", state: next });
        return next;
      });
    } else {
      send({ kind: "ttt-move", i });
    }
  };

  const rematch = () => {
    if (isHost) {
      const s = tttStart();
      setState(s);
      send({ kind: "ttt-state", state: s });
    } else {
      send({ kind: "ttt-rematch" });
    }
  };

  if (!state) {
    return (
      <GlassCard strong className="p-8 text-center text-sm text-muted-foreground animate-pulse" interactive={false}>
        Setting up the board…
      </GlassCard>
    );
  }

  const myMark = mySide === "a" ? "❌" : "⭕";
  const myTurn = state.turn === mySide && !state.winner;
  const status = state.winner === "draw" ? "It's a draw!" :
    state.winner ? (state.winner === mySide ? "🎉 You won!" : `😢 ${partnerName} won!`) :
    myTurn ? "Your turn" : `${partnerName}'s turn…`;

  return (
    <GlassCard strong className="p-4" interactive={false}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❌</span>
          <span className="font-bold">Tic-Tac-Toe vs {partnerName}</span>
        </div>
        <span className="badge">You are {myMark}</span>
      </div>

      <div className={`text-center text-sm font-semibold mb-3 py-2 rounded-xl ${
        state.winner === mySide ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
        state.winner && state.winner !== "draw" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
        "bg-muted/50"
      }`}>
        {status}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-3">
        {state.board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            disabled={!myTurn || !!cell}
            className={`aspect-square rounded-xl text-3xl font-black flex items-center justify-center transition-all ${
              state.line?.includes(i) ? "bg-highlight/30 border-highlight" : "bg-white/5 border-white/10"
            } border-2 ${!cell && myTurn ? "hover:bg-white/10 cursor-pointer" : ""}`}
          >
            {cell === "x" ? "❌" : cell === "o" ? "⭕" : ""}
          </button>
        ))}
      </div>

      {state.winner && (
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-highlight" strokeWidth={2.5} />
          <button onClick={rematch} className="btn-glass text-sm py-2 px-4">
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} /> Play again
          </button>
        </div>
      )}
    </GlassCard>
  );
};

/* ════════════════════════════════════════════════════════════════
   Would You Rather — both sides pick, answers reveal when both voted.
   ════════════════════════════════════════════════════════════════ */

const WYR_QUESTIONS: [string, string][] = [
  ["Be able to fly", "Be invisible"],
  ["Always say what you think", "Never speak again"],
  ["Live without music", "Live without movies"],
  ["Be famous but hated", "Unknown but loved"],
  ["Time travel to the past", "Time travel to the future"],
  ["Never use your phone again", "Never eat your fav food again"],
  ["Talk to animals", "Speak every language"],
  ["Always be 10 min late", "Always be 20 min early"],
  ["Free travel forever", "Free food forever"],
  ["Be the funniest person", "Be the smartest person"],
  ["Live on the beach", "Live in the mountains"],
  ["Only text forever", "Only video call forever"],
  ["Win the lottery", "Live twice as long"],
  ["No internet for a month", "No leaving home for a month"],
  ["Be a great singer", "Be a great dancer"],
  ["Know when you'll die", "Know how you'll die"],
  ["Always whisper", "Always shout"],
  ["Have a pause button", "Have a rewind button"],
  ["Be 3 feet tall", "Be 9 feet tall"],
  ["Read minds", "See the future"],
];

const SyncedWouldYouRather = ({
  partnerName, send, incoming,
}: {
  partnerName: string; send: (p: any) => boolean; incoming: any;
}) => {
  const [q, setQ] = useState(0);
  const [myPick, setMyPick] = useState<0 | 1 | null>(null);
  const [theirPick, setTheirPick] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (!incoming) return;
    if (incoming.kind === "wyr-pick" && incoming.q === q) {
      setTheirPick(incoming.choice);
    } else if (incoming.kind === "wyr-next") {
      setQ(incoming.q);
      setMyPick(null);
      setTheirPick(null);
    }
  }, [incoming, q]);

  const pick = (choice: 0 | 1) => {
    if (myPick !== null) return;
    setMyPick(choice);
    send({ kind: "wyr-pick", q, choice });
  };

  const next = () => {
    const nq = (q + 1) % WYR_QUESTIONS.length;
    send({ kind: "wyr-next", q: nq });
    setQ(nq);
    setMyPick(null);
    setTheirPick(null);
  };

  const [a, b] = WYR_QUESTIONS[q];
  const bothPicked = myPick !== null && theirPick !== null;

  return (
    <GlassCard strong className="p-4" interactive={false}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤔</span>
          <span className="font-bold">Would You Rather</span>
        </div>
        <span className="badge">{q + 1}/{WYR_QUESTIONS.length}</span>
      </div>

      <p className="text-center text-sm text-white/60 mb-4">
        Both of you pick — answers reveal together.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {[a, b].map((option, i) => {
          const picked = myPick === i;
          const theyPicked = theirPick === i;
          return (
            <button
              key={i}
              onClick={() => pick(i as 0 | 1)}
              disabled={myPick !== null}
              className={`rounded-2xl p-4 min-h-[88px] text-sm font-bold flex flex-col items-center justify-center gap-1.5 border-2 transition-all ${
                picked
                  ? "border-highlight bg-highlight/15 text-white"
                  : "border-white/10 bg-white/5 text-white/80 hover:border-white/25"
              } ${myPick !== null && !picked ? "opacity-50" : ""}`}
            >
              <span>{option}</span>
              {bothPicked && theyPicked && <span className="text-[10px] font-semibold text-highlight">{partnerName} picked this</span>}
              {bothPicked && !theyPicked && <span className="text-[10px] font-semibold text-white/40">not them</span>}
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground mb-3">
        {myPick === null ? "Your pick — tap one" :
         theirPick === null ? `Waiting for ${partnerName}…` :
         "Revealed!"}
      </div>

      {bothPicked && (
        <button
          onClick={next}
          className="w-full h-11 rounded-full font-extrabold text-sm text-[#0A0A0F]"
          style={{ background: "linear-gradient(180deg, #FFE45E, #F5D000)" }}
        >
          Next question →
        </button>
      )}
    </GlassCard>
  );
};

export default PeerGames;
