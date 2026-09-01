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
