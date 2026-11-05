// Ad scripts — lazy, per-network loaders.
// Rotated across events so each network sees separate session data:
//   queue / exit / repeat-matchers → Adsterra
//   ad-break / extend / skip       → HillTopAds (slider + popunder)
// Every script injects once per session max.

const SLIDER_SRC =
  "//massivesalad.com/b.XCVMsZdtG/ll0WYWWLcL/WezmX9nuQZEURl/k/P/TCc/1ZOYTXcox/N/DNU/tUNcztU/5TNQzvEC0_O/Qr";
const POPUNDER_SRC =
  "//loyal-product.com/cbDM9/6.b-2c5kl/S-W/Qt9xNfzzUS5hNGzkIJ3vMqyY0q3/NfTrk/3cMBjgc/3u";
const LOBBY_POPUNDER_SRC =
  "//loyal-product.com/cFD.9S6/bq2X5bl/SJWaQw9lNTz/UQ5FN/zSIy3-MFya0n3eNtTTkk3aMQj_co3z";
const ADSTERRA_SRCS = [
  "https://afders.org/1/419b090ed9f3aaac2abdb2c235e7a881",
  "https://bicea.org/14/81e4c3617242ab3655fcfc621ed85536",
  "https://arwf.org/4/e6df5c491748c4595ce36d69f411c4dc",
];

const loaded = new Set<string>();

const inject = (src: string) => {
  if (loaded.has(src) || typeof document === "undefined") return;
  loaded.add(src);
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.setAttribute("data-cfasync", "false");
  s.referrerPolicy = "no-referrer-when-downgrade";
  document.body.appendChild(s);
};

// Lobby "sides" placement — always-on Adsterra zones load when the lobby
// mounts (they self-dock to page edges per each zone's format config).
export const loadLobbyAds = () => loadAdsterra();

export const loadSlider = () => inject(SLIDER_SRC);
export const loadPopunder = () => inject(POPUNDER_SRC);
export const loadLobbyPopunder = () => inject(LOBBY_POPUNDER_SRC);
export const loadAdsterra = () => ADSTERRA_SRCS.forEach(inject);
export const loadVideoAd = () => {
  loadSlider();
  loadPopunder();
  loadAdsterra();
};
