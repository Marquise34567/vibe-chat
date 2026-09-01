/**
 * Simplified 8-ball pool for FaceFrenzy matches.
 * Lightweight 2D physics on a canvas — playable in-chat.
 */

export type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isCue: boolean;
  pocketed: boolean;
  type?: "solid" | "stripe"; // assigned after first pot
};

export type PoolState = {
  balls: Ball[];
  cueAngle: number;
  power: number; // 0-1
  isAiming: boolean;
  isMoving: boolean;
  turn: "me" | "them";
  myType: "solid" | "stripe" | null;
  theirType: "solid" | "stripe" | null;
  potted: { me: number[]; them: number[] };
  winner: "me" | "them" | null;
  message: string;
};

export const TABLE_W = 360;
export const TABLE_H = 200;
export const BALL_R = 8;
export const FRICTION = 0.985;
export const MIN_VEL = 0.05;
export const POCKET_R = 12;
export const CUSHION = 14;

export const POCKETS = [
  { x: CUSHION, y: CUSHION },
  { x: TABLE_W / 2, y: CUSHION - 4 },
  { x: TABLE_W - CUSHION, y: CUSHION },
  { x: CUSHION, y: TABLE_H - CUSHION },
  { x: TABLE_W / 2, y: TABLE_H - CUSHION + 4 },
  { x: TABLE_W - CUSHION, y: TABLE_H - CUSHION },
];

const BALL_COLORS = [
  "#fbbf24", // 1 yellow
  "#3b82f6", // 2 blue
  "#ef4444", // 3 red
  "#8b5cf6", // 4 purple
  "#f97316", // 5 orange
  "#22c55e", // 6 green
  "#7f1d1d", // 7 maroon
  "#1a1a1a", // 8 black
];

export const initPool = (): PoolState => {
  const balls: Ball[] = [];
  // Cue ball
  balls.push({ id: 0, x: TABLE_W * 0.25, y: TABLE_H / 2, vx: 0, vy: 0, radius: BALL_R, color: "#ffffff", isCue: true, pocketed: false });

  // Rack the 8 balls in a triangle
  const rackX = TABLE_W * 0.7;
  const rackY = TABLE_H / 2;
  const spacing = BALL_R * 2 + 1;
  let id = 1;
  const positions = [
    [0, 0],
    [1, -0.5], [1, 0.5],
    [2, -1], [2, 0], [2, 1],
    [3, -1.5], [3, -0.5], [3, 0.5], [3, 1.5],
  ];
  // We only use 8 balls (1-8) for simplicity
  const rackOrder = [1, 2, 3, 4, 8, 5, 6, 7]; // 8-ball in center
  for (let i = 0; i < 8; i++) {
    const [row, col] = positions[i];
    balls.push({
      id: rackOrder[i],
      x: rackX + row * spacing,
      y: rackY + col * spacing,
      vx: 0, vy: 0,
      radius: BALL_R,
      color: BALL_COLORS[rackOrder[i] - 1],
      isCue: false,
      pocketed: false,
    });
  }

  return {
    balls,
    cueAngle: 0,
    power: 0,
    isAiming: true,
    isMoving: false,
    turn: "me",
    myType: null,
    theirType: null,
    potted: { me: [], them: [] },
    winner: null,
    message: "Your break! Aim and shoot.",
  };
};

/** Step physics forward by one frame */
export const stepPhysics = (state: PoolState): PoolState => {
  if (!state.isMoving) return state;

  const balls = state.balls.map((b) => ({ ...b }));

  // Move
  for (const b of balls) {
    if (b.pocketed) continue;
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= FRICTION;
    b.vy *= FRICTION;
    if (Math.abs(b.vx) < MIN_VEL) b.vx = 0;
    if (Math.abs(b.vy) < MIN_VEL) b.vy = 0;
  }

  // Wall collisions
  for (const b of balls) {
    if (b.pocketed) continue;
    if (b.x - b.radius < CUSHION) { b.x = CUSHION + b.radius; b.vx = -b.vx * 0.8; }
    if (b.x + b.radius > TABLE_W - CUSHION) { b.x = TABLE_W - CUSHION - b.radius; b.vx = -b.vx * 0.8; }
    if (b.y - b.radius < CUSHION) { b.y = CUSHION + b.radius; b.vy = -b.vy * 0.8; }
    if (b.y + b.radius > TABLE_H - CUSHION) { b.y = TABLE_H - CUSHION - b.radius; b.vy = -b.vy * 0.8; }
  }

  // Ball-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      if (a.pocketed || b.pocketed) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;
      if (dist < minDist && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;
        // Elastic collision
        const dvx = b.vx - a.vx, dvy = b.vy - a.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot < 0) {
          a.vx += dot * nx;
          a.vy += dot * ny;
          b.vx -= dot * nx;
          b.vy -= dot * ny;
        }
      }
    }
  }

  // Pocket detection
  let pottedThisFrame: Ball[] = [];
  for (const b of balls) {
    if (b.pocketed) continue;
    for (const p of POCKETS) {
      const dx = b.x - p.x, dy = b.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < POCKET_R) {
        b.pocketed = true;
        b.vx = 0; b.vy = 0;
        pottedThisFrame.push(b);
        break;
      }
    }
  }

  // Check if all stopped
  const anyMoving = balls.some((b) => !b.pocketed && (Math.abs(b.vx) > 0 || Math.abs(b.vy) > 0));

  let newState: PoolState = {
    ...state,
    balls,
    isMoving: anyMoving,
  };

  // Process potted balls when all stop
  if (!anyMoving && pottedThisFrame.length > 0) {
    return processPotted(newState, pottedThisFrame);
  }

  if (!anyMoving) {
    // Switch turn
    const cue = balls.find((b) => b.isCue);
    if (cue && cue.pocketed) {
      // Scratch — reset cue
      cue.pocketed = false;
      cue.x = TABLE_W * 0.25;
      cue.y = TABLE_H / 2;
      cue.vx = 0; cue.vy = 0;
    }
    newState = {
      ...newState,
      isAiming: true,
      turn: state.turn === "me" ? "them" : "me",
      message: state.turn === "me" ? "Opponent's turn." : "Your turn.",
    };
  }

  return newState;
};

const processPotted = (state: PoolState, potted: Ball[]): PoolState => {
  const shooter = state.turn;
  let myType = state.myType;
  let theirType = state.theirType;
  let pottedMe = [...state.potted.me];
  let pottedThem = [...state.potted.them];
  let winner = state.winner;
  let message = state.message;

  // Assign types on first pot (not 8-ball, not cue)
  const firstPot = !myType && !theirType;
  const coloredPot = potted.find((b) => !b.isCue && b.id !== 8);
  if (firstPot && coloredPot) {
    const type = coloredPot.id <= 7 ? "solid" : "stripe";
    if (shooter === "me") { myType = type; theirType = type === "solid" ? "stripe" : "solid"; }
    else { theirType = type; myType = type === "solid" ? "stripe" : "solid"; }
  }

  for (const b of potted) {
    if (b.isCue) continue; // scratch handled elsewhere
    if (b.id === 8) {
      // 8-ball potted — check if all of shooter's type are potted
      const shooterType = shooter === "me" ? myType : theirType;
      const shooterPotted = shooter === "me" ? pottedMe : pottedThem;
      const allOfTypePotted = shooterType !== null && BALL_COLORS
        .map((_, i) => i + 1)
        .filter((id) => shooterType === "solid" ? id <= 7 : id > 7)
        .every((id) => shooterPotted.includes(id));
      if (allOfTypePotted) {
        winner = shooter;
        message = shooter === "me" ? "🎉 You sank the 8-ball — you win!" : "😢 Opponent sank the 8-ball — you lose!";
      } else {
        winner = shooter === "me" ? "them" : "me";
        message = shooter === "me" ? "😢 You sank the 8-ball early — you lose!" : "🎉 Opponent sank the 8-ball early — you win!";
      }
      continue;
    }
    if (shooter === "me") pottedMe.push(b.id);
    else pottedThem.push(b.id);
  }

  return {
    ...state,
    myType, theirType,
    potted: { me: pottedMe, them: pottedThem },
    winner,
    message: winner ? message : `${shooter === "me" ? "You" : "Opponent"} potted ${potted.filter(b => !b.isCue).map(b => b.id).join(", ")}!`,
  };
};

/** Shoot the cue ball with current angle and power */
export const shoot = (state: PoolState): PoolState => {
  if (state.isMoving || state.winner) return state;
  const cue = state.balls.find((b) => b.isCue);
  if (!cue || cue.pocketed) return state;
  const speed = 8 * state.power;
  const balls = state.balls.map((b) =>
    b.isCue ? { ...b, vx: Math.cos(state.cueAngle) * speed, vy: Math.sin(state.cueAngle) * speed } : b
  );
  return {
    ...state,
    balls,
    isAiming: false,
    isMoving: true,
    power: 0,
    message: state.turn === "me" ? "Nice shot!" : "Opponent shot.",
  };
};

/** AI opponent shoots toward nearest ball */
export const opponentShoot = (state: PoolState): PoolState => {
  if (state.isMoving || state.winner || state.turn !== "them") return state;
  const cue = state.balls.find((b) => b.isCue);
  if (!cue) return state;

  // Find nearest non-potted, non-cue ball
  let nearest: Ball | null = null;
  let minDist = Infinity;
  for (const b of state.balls) {
    if (b.pocketed || b.isCue) continue;
    const d = Math.sqrt((b.x - cue.x) ** 2 + (b.y - cue.y) ** 2);
    if (d < minDist) { minDist = d; nearest = b; }
  }
  if (!nearest) return state;

  const angle = Math.atan2(nearest.y - cue.y, nearest.x - cue.x);
  const power = 0.5 + Math.random() * 0.4;

  return shoot({ ...state, cueAngle: angle, power });
};
