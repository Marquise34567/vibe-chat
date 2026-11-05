import { createRoot } from "react-dom/client";
import { PostHogProvider } from "posthog-js/react";
import App from "./App.tsx";
import { hasPostHogHost, hasPostHogKey } from "./lib/posthogLogs.ts";
import "./index.css";

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const posthogKeyConfigured = hasPostHogKey(posthogKey);
const posthogHostConfigured = hasPostHogHost(posthogHost);

if (import.meta.env.DEV && !posthogKeyConfigured) {
  throw new Error("VITE_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_KEY is configured");
}

if (import.meta.env.DEV && !posthogHostConfigured) {
  throw new Error("VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured");
}

const posthogOptions = posthogHostConfigured
  ? {
      api_host: posthogHost,
      defaults: "2025-05-24" as const,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      logs: {
        serviceName: "vibe-chat-web",
        environment: import.meta.env.MODE,
      },
      debug: import.meta.env.DEV,
    }
  : undefined;

const posthogEnabled = Boolean(posthogKeyConfigured && posthogOptions);
const app = <App posthogEnabled={posthogEnabled} />;

// Register the push service worker early — it only handles "someone's
// online" ping events, no fetch interception.
if ("serviceWorker" in navigator && import.meta.env.VITE_VAPID_PUBLIC_KEY) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  posthogEnabled ? (
    <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
      {app}
    </PostHogProvider>
  ) : app,
);
