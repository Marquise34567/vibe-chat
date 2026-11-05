/**
 * Browser push plumbing — registers /sw.js and manages the "someone's
 * online" ping subscription. Two delivery paths:
 *
 *  1. Tab open but backgrounded → local Notification (no push service)
 *  2. Tab closed → real Web Push from the match server (VAPID tickle)
 */

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const b64uToBytes = (s: string): Uint8Array => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// Own worker path — /sw.js is claimed by the ad network's in-page-push
// worker, so pool pings register under a separate scope.
const PUSH_SW_URL = "/ff-push-sw.js";

let regPromise: Promise<ServiceWorkerRegistration> | null = null;

export const swRegistration = (): Promise<ServiceWorkerRegistration | null> => {
  if (!pushSupported()) return Promise.resolve(null);
  regPromise ??= navigator.serviceWorker.register(PUSH_SW_URL);
  return regPromise;
};

/**
 * Ask for notification permission + create (or reuse) the push
 * subscription. Returns the PushSubscription JSON to ship to the match
 * server, or null when unsupported/denied/unconfigured.
 */
export const subscribeToPoolPings = async (): Promise<PushSubscriptionJSON | null> => {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!pushSupported() || !vapid) return null;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;
  const reg = await swRegistration();
  if (!reg) return null;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64uToBytes(vapid) as BufferSource,
    }));
  return sub.toJSON();
};

/** Return the current subscription without prompting, if one exists. */
export const existingSubscription = async (): Promise<PushSubscriptionJSON | null> => {
  const reg = await swRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub?.toJSON() ?? null;
};

/**
 * Local-only notification for a tab that's open but hidden — no push
 * service involved. No-op unless the page is actually backgrounded and
 * permission was granted.
 */
export const pingLocalNotification = (title: string, body: string) => {
  if (!pushSupported() || Notification.permission !== "granted" || !document.hidden) return;
  try {
    new Notification(title, { body, icon: "/favicon.svg", tag: "ff-match-found" });
  } catch {}
};
