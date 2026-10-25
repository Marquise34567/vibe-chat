import type { PostHog } from "posthog-js";

export const hasPostHogKey = (value?: string) => Boolean(value?.startsWith("phc_"));
export const hasPostHogHost = (value?: string) => Boolean(value && !value.includes("your-posthog-ingestion-host"));

export const capturePostHogEvent = (
  posthog: PostHog,
  event: string,
  properties?: Record<string, string | number | boolean>,
) => {
  if (!hasPostHogKey(import.meta.env.VITE_PUBLIC_POSTHOG_KEY) || !hasPostHogHost(import.meta.env.VITE_PUBLIC_POSTHOG_HOST)) return;
  posthog.capture(event, properties);
};

export const posthogLogs = {
  applicationStarted(posthog: PostHog) {
    posthog.logger.info("application_started", { application: "vibe-chat-web" });
  },

  identityResolved(posthog: PostHog) {
    posthog.logger.info("identity_resolved", { identity_source: "authenticated_session" });
  },

  identityReset(posthog: PostHog) {
    posthog.logger.info("identity_reset", { reason: "account_changed" });
  },
};
