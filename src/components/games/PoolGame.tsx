import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GlassCard } from "@/components/glass";
import {
  initPool, stepPhysics, shoot, opponentShoot,
  TABLE_W, TABLE_H, CUSHION, POCKETS, POCKET_R, BALL_R,
  type PoolState,
} from "@/lib/games/pool";

export const PoolGame = ({ onClose }: { onClose: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<PoolState>(() => initPool());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Physics loop
  useEffect(() => {
    if (!state.isMoving) return;
    let raf: number;
    const loop = () => {
      setState((s) => stepPhysics(s));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.isMoving]);

  // Opponent auto-shoots
  useEffect(() => {
    if (state.turn === "them" && !state.isMoving && !state.winner && state.isAiming) {
      const t = setTimeout(() => setState((s) => opponentShoot(s)), 1500);
      return () => clearTimeout(t);
    }
  }, [state.turn, state.isMoving, state.winner, state.isAiming]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Felt
    ctx.fillStyle = "#1a6b3c";
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);

    // Cushions
    ctx.fillStyle = "#0d4a26";
    ctx.fillRect(0, 0, TABLE_W, CUSHION);
    ctx.fillRect(0, TABLE_H - CUSHION, TABLE_W, CUSHION);
    ctx.fillRect(0, 0, CUSHION, TABLE_H);
    ctx.fillRect(TABLE_W - CUSHION, 0, CUSHION, TABLE_H);

    // Pockets
    for (const p of POCKETS) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.fill();
    }

    // Aim line
    if (state.isAiming && !state.winner && state.turn === "me") {
      const cue = state.balls.find((b) => b.isCue);
      if (cue && !cue.pocketed) {
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(
          cue.x + Math.cos(state.cueAngle) * 100,
          cue.y + Math.sin(state.cueAngle) * 100
        );
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Balls
    for (const b of state.balls) {
      if (b.pocketed) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // Number
      if (!b.isCue) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(b.id), b.x, b.y);
      }
    }
  }, [state]);

  // Mouse interaction for aiming
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.isMoving || !state.isAiming || state.turn !== "me" || state.winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * TABLE_W;
    const my = ((e.clientY - rect.top) / rect.height) * TABLE_H;
    const cue = state.balls.find((b) => b.isCue);
    if (!cue) return;
    const angle = Math.atan2(my - cue.y, mx - cue.x);
    setState((s) => ({ ...s, cueAngle: angle }));
  }, [state.isMoving, state.isAiming, state.turn, state.winner, state.balls]);

  const handleClick = useCallback(() => {
    if (state.isMoving || !state.isAiming || state.turn !== "me" || state.winner) return;
    const power = 0.6 + Math.random() * 0.3;
    setState((s) => shoot({ ...s, power }));
  }, [state.isMoving, state.isAiming, state.turn, state.winner]);

  const restart = () => setState(initPool());

  return (
    <GlassCard strong className="p-4" interactive={false}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎱</span>
          <span className="font-bold">8-Ball Pool</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge">
            {state.myType ? `You: ${state.myType}` : "Open table"}
          </span>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      </div>

      <div className={`text-center text-sm font-semibold mb-3 py-2 rounded-xl ${
        state.winner === "me" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
        state.winner === "them" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" :
        "bg-muted/50"
      }`}>
        {state.message}
      </div>

      <div className="flex justify-center mb-3">
        <canvas
          ref={canvasRef}
          width={TABLE_W}
          height={TABLE_H}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className="rounded-xl shadow-lg cursor-crosshair max-w-full"
          style={{ aspectRatio: `${TABLE_W}/${TABLE_H}` }}
        />
      </div>

      {/* Potted balls */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">You:</span>
          {state.potted.me.map((id) => (
            <span key={id} className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center border border-black/20">{id}</span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {state.potted.them.map((id) => (
            <span key={id} className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center border border-black/20">{id}</span>
          ))}
          <span className="text-muted-foreground">:Opp</span>
        </div>
      </div>

      {state.winner ? (
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-5 h-5 text-highlight" strokeWidth={2.5} />
          <button onClick={restart} className="btn-glass text-sm py-2 px-4">
            <RotateCcw className="w-4 h-4" strokeWidth={2.5} /> Play again
          </button>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground">
          {state.turn === "me"
            ? state.isMoving ? "Balls rolling…" : "Move mouse to aim, click to shoot"
            : "Opponent aiming…"}
        </div>
      )}
    </GlassCard>
  );
};
