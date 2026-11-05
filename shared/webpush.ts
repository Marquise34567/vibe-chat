/**
 * Minimal Web Push "tickle" sender — VAPID-signed POST with NO payload.
 *
 * No payload means no encryption needed: the push service still delivers
 * the event, and the site's service worker (/sw.js) decides what
 * notification to show. Used to pull departed searchers back when a new
 * person enters an empty matching pool.
 *
 * Runs in Cloudflare Workers and Node 18+ (globalThis.crypto.subtle).
 */

export type PushSubscriptionLike = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type VapidConfig = {
  /** base64url uncompressed EC point (65 bytes: 0x04 || x || y) */
  publicKey: string;
  /** base64url 32-byte private scalar */
  privateKey: string;
  /** "mailto:…" or "https:…" — push services use this for abuse contact */
  subject: string;
};

const bytesToB64u = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64uToBytes = (s: string): Uint8Array => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const encode = (s: string) => new TextEncoder().encode(s);

async function vapidJwt(endpoint: string, cfg: VapidConfig): Promise<string> {
  const pub = b64uToBytes(cfg.publicKey); // [0x04, x…32, y…32]
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: cfg.privateKey,
      x: bytesToB64u(pub.slice(1, 33)),
      y: bytesToB64u(pub.slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = bytesToB64u(encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64u(
    encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: cfg.subject,
      })
    )
  );
  const unsigned = `${header}.${payload}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encode(unsigned))
  );
  return `${unsigned}.${bytesToB64u(sig)}`;
}

/**
 * POST a payload-free push to the subscription endpoint.
 * Returns the HTTP status — caller should delete the sub on 404/410
 * (subscription gone/expired).
 */
export async function sendPushTickle(
  sub: PushSubscriptionLike,
  cfg: VapidConfig
): Promise<number> {
  const jwt = await vapidJwt(sub.endpoint, cfg);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${cfg.publicKey}`,
      TTL: "600",
      Urgency: "high",
    },
  });
  // Drain so the fetch completes cleanly (keep-alive reuse).
  await res.arrayBuffer().catch(() => undefined);
  return res.status;
}
