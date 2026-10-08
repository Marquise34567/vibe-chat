# FaceFrenzy — Project Guide

## Commands

- `npm run dev` — Start Vite dev server (frontend only, port 8082)
- `npm run server` — Start local WebSocket match server (port 8090, or MATCH_SERVER_PORT env)
- `npm run dev:all` — Start both match server + Vite concurrently
- `npm run worker` — Start Cloudflare Worker locally via `wrangler dev` (port 8090)
- `npm run worker:deploy` — Deploy the match backend to Cloudflare Workers
- `npm run build` — Production build
- `npx tsc --noEmit` — Typecheck (frontend); `npx tsc -p worker/tsconfig.json` for the worker

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (profiles, auth, presence) + Node.js WebSocket server (matching + WebRTC signaling)
- **Real-time video**: WebRTC P2P — the match server only relays signaling (offer/answer/ICE), video goes directly peer-to-peer for zero lag
- **Identity**: every visitor is recorded in `public.visitors` (id = stable local UUID, display_name, gender, country, first/last_seen_at) via the `record_visitor` SECURITY DEFINER RPC — anon key works, zero direct table access. `src/lib/identitySync.ts` calls it; `usePresence` heartbeats it every 30s for guests (signed-in users heartbeat `profiles.last_seen_at` instead). Supabase project ref: `esweiwhdujfkgtrdtirm`.

## Match Server

- Production: Cloudflare Worker + Durable Object — `worker/match-worker.ts`, `wrangler.toml`
  - Single "global" `Matchmaker` DO holds all clients via WebSocket hibernation (per-client state in socket attachments, rooms + banned IPs in DO storage)
  - Also serves `POST /api/sponsor-checkout` (Stripe — `{label,link,days}` sponsor box or `{plan}` Plus/VIP subscription), `POST /api/plus-verify`, `POST /api/fetch-preview` (OG scraper)
  - `GET /api/analytics` + `GET /api/insights` — matchmaking analytics + AI insights (Workers AI `AI` binding, heuristic fallback). `?key=` required if `ADMIN_KEY` set
  - Secrets: `npx wrangler secret put STRIPE_SECRET_KEY` (+ `ADMIN_KEY` optional)
- Shared analytics shape + heuristic insights: `shared/analytics.ts` (imported by both worker and node server)
- Local dev alternative: `server/match-server.ts` — same protocol on Node `ws` (port 8090, `MATCH_SERVER_PORT` env). This is what `npm run server` uses.
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
- `src/components/HalloweenOverlay.tsx` + `src/lib/halloween.ts` — "Fright Fest" seasonal theme (auto Oct 1–Nov 3, override via localStorage `ff:halloween` = "on"/"off")
- `src/components/PaywallSheet.tsx` + `src/lib/limits.ts` — hard paywall: 10 free matches/day, gender + region filters are Plus-only
- `src/pages/Admin.tsx` — hidden `/admin` dashboard (live stats, gender split, countries, AI insights)

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_MATCH_SERVER_URL` — WebSocket match server URL (default: ws://localhost:8090; prod: wss://facefrenzy-match.<subdomain>.workers.dev)
- `MATCH_SERVER_PORT` — Port for local Node match server (default: 8090)
- `STRIPE_SECRET_KEY` — Worker secret for sponsor + Plus/VIP checkout (optional locally — Stripe endpoints 503 without it)
- `ADMIN_KEY` — Optional secret; if set, `/api/analytics` + `/api/insights` require `?key=`
- `FRONTEND_URL` — Worker var for CORS + Stripe redirect URLs (set in wrangler.toml)

## Modes

- `solo` — 1-on-1 random video chat (2 people, 50/50 split)
- `group` — Group chat (3-4 people, dynamic tile layout)
- `blind` — Voice first, cameras reveal at 30s (no webcam until reveal)
