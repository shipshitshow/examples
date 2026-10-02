import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  if (!key) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // We fire pageviews manually via PostHogPageView
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

export { posthog };
