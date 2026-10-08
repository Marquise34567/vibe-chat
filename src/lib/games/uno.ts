/**
 * Simplified Uno game logic for FaceFrenzy matches.
 * 2-player (you vs match). Playable in-chat.
 */

export type UnoColor = "red" | "yellow" | "green" | "blue" | "wild";
export type UnoCard = {
  id: string;
  color: UnoColor;
  value: number | "skip" | "reverse" | "draw2" | "wild" | "wild4";
};

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
const colorHex: Record<Exclude<UnoColor, "wild">, string> = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
};

export const unoColorHex = (c: UnoColor) => (c === "wild" ? "#1a1a2e" : colorHex[c]);

let cardIdCounter = 0;
const nextId = () => `uno-${cardIdCounter++}`;

const makeCard = (color: UnoColor, value: UnoCard["value"]): UnoCard => ({ id: nextId(), color, value });

export const buildDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push(makeCard(color, 0)); // one 0
    for (let n = 1; n <= 9; n++) {
      deck.push(makeCard(color, n));
      deck.push(makeCard(color, n));
    }
    for (const action of ["skip", "reverse", "draw2"] as const) {
      deck.push(makeCard(color, action));
      deck.push(makeCard(color, action));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard("wild", "wild"));
    deck.push(makeCard("wild", "wild4"));
  }
  return shuffle(deck);
};

export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const canPlay = (card: UnoCard, top: UnoCard, currentColor: UnoColor): boolean => {
  if (card.color === "wild") return true;
  if (card.color === currentColor) return true;
  if (card.value === top.value) return true;
  return false;
};

export type UnoState = {
  deck: UnoCard[];
  hand: UnoCard[];
  opponentHandCount: number;
  top: UnoCard;
  currentColor: UnoColor;
  turn: "me" | "them";
  winner: "me" | "them" | null;
  message: string;
};

export const startUno = (): UnoState => {
  const deck = buildDeck();
  const hand = deck.splice(0, 7);
  const opponentHandCount = 7;
  // First card can't be wild
  let top = deck.shift()!;
  while (top.color === "wild") {
    deck.push(top);
    top = deck.shift()!;
  }
  return {
    deck,
    hand,
    opponentHandCount,
    top,
    currentColor: top.color,
    turn: "me",
    winner: null,
    message: "Your turn — play a card or draw!",
  };
};

export const drawCard = (state: UnoState): UnoState => {
  if (state.winner) return state;
  if (state.turn !== "me") return state;
  const card = state.deck.shift();
  if (!card) return { ...state, message: "Deck is empty!" };
  const newHand = [...state.hand, card];
  // After drawing, pass turn
  return {
    ...state,
    hand: newHand,
    turn: "them",
    message: "You drew a card. Opponent's turn.",
  };
};

export const playCard = (
  state: UnoState,
  cardId: string,
  chosenColor?: UnoColor
): UnoState => {
  if (state.winner) return state;
  if (state.turn !== "me") return state;

  const card = state.hand.find((c) => c.id === cardId);
  if (!card) return state;
  if (!canPlay(card, state.top, state.currentColor)) {
    return { ...state, message: "Can't play that card!" };
  }
  if (card.color === "wild" && !chosenColor) {
    return { ...state, message: "Choose a color first!" };
  }

  const newHand = state.hand.filter((c) => c.id !== cardId);
  const newColor = card.color === "wild" ? chosenColor! : card.color;
  let opponentDraws = 0;
  let skipOpponent = false;

  if (card.value === "draw2") opponentDraws = 2;
  if (card.value === "wild4") opponentDraws = 4;
  if (card.value === "skip" || card.value === "reverse") skipOpponent = true;

  // Check win
  if (newHand.length === 0) {
    return { ...state, hand: [], top: card, currentColor: newColor, winner: "me", message: "🎉 You won!" };
  }

  let nextState: UnoState = {
    ...state,
    hand: newHand,
    top: card,
    currentColor: newColor,
    turn: skipOpponent ? "me" : "them",
    message: skipOpponent ? "Skip! Your turn again." : "Opponent's turn.",
  };

  // Opponent draws if applicable
  if (opponentDraws > 0) {
    nextState = {
      ...nextState,
      opponentHandCount: nextState.opponentHandCount - opponentDraws + 0, // they drew, net same for count display
      message: `Opponent draws ${opponentDraws}! ${skipOpponent ? "Your turn." : "Opponent's turn."}`,
    };
  }

  return nextState;
};

/* ════════════════════════════════════════════════════════════════
   Multiplayer (synced over WebRTC data channel)
   ────────────────────────────────────────────────────────────────
   Host-authoritative: one peer (the WebRTC caller) holds the full
   state — deck, both hands, discard pile — applies moves from both
   sides, and broadcasts the full state after every change. Each
   client renders a private "view" via unoViewFor(), which maps to
   the same UnoState shape the solo game UI already renders.
   ════════════════════════════════════════════════════════════════ */

export type UnoSide = "a" | "b";

export type UnoFullState = {
  deck: UnoCard[];
  discard: UnoCard[];       // played cards under the top — reshuffled when deck empties
  hands: Record<UnoSide, UnoCard[]>;
  top: UnoCard;
  currentColor: UnoColor;
  turn: UnoSide;
  winner: UnoSide | null;
  lastEvent: { actor: UnoSide; text: string } | null;
};

export type UnoMove =
  | { type: "play"; cardId: string; color?: UnoColor }
  | { type: "draw" };

export const otherSideOf = (s: UnoSide): UnoSide => (s === "a" ? "b" : "a");

export const startUnoFull = (): UnoFullState => {
  const deck = buildDeck();
  const a = deck.splice(0, 7);
  const b = deck.splice(0, 7);
  // First card can't be wild
  let top = deck.shift()!;
  while (top.color === "wild") {
    deck.push(top);
    top = deck.shift()!;
  }
  return {
    deck,
    discard: [],
    hands: { a, b },
    top,
    currentColor: top.color,
    turn: "a",
    winner: null,
    lastEvent: null,
  };
};

/** Draw `n` cards for `side`, reshuffling the discard pile if the deck runs out. */
const drawInto = (s: UnoFullState, side: UnoSide, n: number): UnoFullState => {
  let { deck, discard } = s;
  const hand = [...s.hands[side]];
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break; // truly out of cards
      deck = shuffle(discard);
      discard = [];
    }
    hand.push(deck.shift()!);
  }
  return { ...s, deck, discard, hands: { ...s.hands, [side]: hand } };
};

export const applyUnoMove = (s: UnoFullState, side: UnoSide, move: UnoMove): UnoFullState => {
  if (s.winner || s.turn !== side) return s;

  if (move.type === "draw") {
    const next = drawInto(s, side, 1);
    if (next.hands[side].length === s.hands[side].length) {
      return { ...s, lastEvent: { actor: side, text: "couldn't draw — deck empty" } };
    }
    return {
      ...next,
      turn: otherSideOf(side),
      lastEvent: { actor: side, text: "drew a card" },
    };
  }

  const card = s.hands[side].find((c) => c.id === move.cardId);
  if (!card) return s;
  if (!canPlay(card, s.top, s.currentColor)) {
    return { ...s, lastEvent: { actor: side, text: "played a card that doesn't match" } };
  }
  if (card.color === "wild" && !move.color) return s; // must choose a color

  const hands = { ...s.hands, [side]: s.hands[side].filter((c) => c.id !== cardId) };
  const newColor = card.color === "wild" ? move.color! : card.color;
  const base: UnoFullState = {
    ...s,
    discard: [...s.discard, s.top],
    top: card,
    currentColor: newColor,
    hands,
  };

  if (hands[side].length === 0) {
    return { ...base, winner: side, lastEvent: { actor: side, text: "went out — game over!" } };
  }

  // Action cards: in 2-player, skip/reverse/+2/+4 all mean "you go again"
  // (the victim loses their turn; +2/+4 also make them draw).
  const drawN = card.value === "draw2" ? 2 : card.value === "wild4" ? 4 : 0;
  if (drawN > 0) {
    const next = drawInto(base, otherSideOf(side), drawN);
    return {
      ...next,
      turn: side,
      lastEvent: { actor: side, text: `played +${drawN} — opponent draws ${drawN}` },
    };
  }
  if (card.value === "skip" || card.value === "reverse") {
    return {
      ...base,
      turn: side,
      lastEvent: { actor: side, text: `played ${card.color} ${card.value} — go again` },
    };
  }
  return {
    ...base,
    turn: otherSideOf(side),
    lastEvent: { actor: side, text: `played ${card.color} ${card.value}` },
  };
};

/** Convert the authoritative state into the per-player view shape the UI renders. */
export const unoViewFor = (s: UnoFullState, side: UnoSide): UnoState => ({
  deck: s.deck,
  hand: s.hands[side],
  opponentHandCount: s.hands[otherSideOf(side)].length,
  top: s.top,
  currentColor: s.currentColor,
  turn: s.turn === side ? "me" : "them",
  winner: s.winner ? (s.winner === side ? "me" : "them") : null,
  message: s.lastEvent
    ? `${s.lastEvent.actor === side ? "You" : "Opponent"} ${s.lastEvent.text}`
    : s.turn === side ? "Your turn — play a card or draw!" : "Opponent goes first.",
});

/** AI opponent plays — picks first playable card */
export const opponentPlay = (state: UnoState): UnoState => {
  if (state.winner) return state;
  if (state.turn !== "them") return state;

  // Simulate opponent hand (we don't track it, just count)
  // 70% chance they have a playable card
  const hasPlayable = Math.random() < 0.7;
  if (!hasPlayable) {
    // Opponent draws
    return {
      ...state,
      opponentHandCount: state.opponentHandCount + 1,
      turn: "me",
      message: "Opponent drew a card. Your turn!",
    };
  }

  // Opponent plays a random "card" — we simulate by picking a color/value
  const colors = COLORS.filter((c) => c === state.currentColor);
  const playColor = colors[0] || COLORS[Math.floor(Math.random() * 4)];
  const values: UnoCard["value"][] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "skip", "reverse", "draw2"];
  const playValue = values[Math.floor(Math.random() * values.length)];

  const playedCard = makeCard(playColor, playValue);
  let opponentDraws = 0;
  let skipMe = false;
  if (playValue === "draw2") opponentDraws = 2;
  if (playValue === "skip" || playValue === "reverse") skipMe = true;

  const newOpponentCount = state.opponentHandCount - 1;
  if (newOpponentCount <= 0) {
    return { ...state, top: playedCard, currentColor: playColor, opponentHandCount: 0, winner: "them", message: "😢 Opponent won!" };
  }

  let myDraws = 0;
  if (opponentDraws > 0) {
    const drawn = state.deck.splice(0, opponentDraws);
    myDraws = drawn.length;
  }

  return {
    ...state,
    top: playedCard,
    currentColor: playColor,
    opponentHandCount: newOpponentCount,
    hand: myDraws > 0 ? [...state.hand, ...state.deck.splice(0, myDraws)] : state.hand,
    turn: skipMe ? "them" : "me",
    message: `Opponent played ${playColor} ${playValue}.${opponentDraws > 0 ? ` You draw ${opponentDraws}!` : ""}${skipMe ? " Skipped!" : ""} ${skipMe ? "Opponent again." : "Your turn!"}`,
  };
};
