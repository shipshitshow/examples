import { PostHog } from 'posthog-node';

import { config } from '../config.js';

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!config.POSTHOG_API_KEY) return null;
  if (!_client) {
    _client = new PostHog(config.POSTHOG_API_KEY, {
      host: config.POSTHOG_HOST,
      flushAt: 20,
      flushInterval: 10_000,
    });
  }
  return _client;
}

export function capture(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const client = getClient();
  if (!client) return;
  client.capture({ distinctId, event, properties });
}

export async function shutdown(): Promise<void> {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
