# FaceFrenzy — Project Guide

## Commands

- `npm run dev` — Start Vite dev server (frontend only, port 8082)
- `npm run server` — Start WebSocket match server (port 8090, or MATCH_SERVER_PORT env)
- `npm run dev:all` — Start both match server + Vite concurrently
- `npm run build` — Production build
- `npx tsc --noEmit` — Typecheck

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (profiles, auth, presence) + Node.js WebSocket server (matching + WebRTC signaling)
- **Real-time video**: WebRTC P2P — the match server only relays signaling (offer/answer/ICE), video goes directly peer-to-peer for zero lag

## Match Server

- Location: `server/match-server.ts`
- Runs on port 8090 (configurable via `MATCH_SERVER_PORT` env var)
- Handles: presence, matching queue by mode/gender/scholar/country, WebRTC signaling relay
- Client hook: `src/hooks/useMatchConnection.ts`

## Key Files

- `src/pages/app/StartTab.tsx` — Lobby (mode picker, webcam preview, inline preferences, invite friends, CTA)
- `src/pages/Match.tsx` — Searching screen (WebSocket connection, webcam preview, radar animation)
- `src/pages/ChatRoom.tsx` — Connected video chat (WebRTC remote video, tile layouts, controls)
- `src/hooks/useMatchConnection.ts` — WebSocket + WebRTC client logic
- `src/hooks/useWebcam.ts` — Local camera access
- `src/components/FaceFrenzyIcons.tsx` — Custom SVG icons
- `src/components/MatchIcons.tsx` — Match screen animated icons

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_MATCH_SERVER_URL` — WebSocket match server URL (default: ws://localhost:8090)
- `MATCH_SERVER_PORT` — Port for match server (default: 8090)

## Modes

- `solo` — 1-on-1 random video chat (2 people, 50/50 split)
- `group` — Group chat (3-4 people, dynamic tile layout)
- `blind` — Voice first, cameras reveal at 30s (no webcam until reveal)
