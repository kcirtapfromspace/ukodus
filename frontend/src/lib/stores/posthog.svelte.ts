import posthog from 'posthog-js';
import { browser } from '$app/environment';

declare global {
	interface Window {
		__RUNTIME_CONFIG__?: {
			POSTHOG_KEY?: string;
			POSTHOG_HOST?: string;
		};
	}
}

class PostHogStore {
	initialized = $state(false);

	init() {
		if (!browser || this.initialized) return;

		const cfg = window.__RUNTIME_CONFIG__;
		const key = cfg?.POSTHOG_KEY;
		const host = cfg?.POSTHOG_HOST;
		if (!key) return;

		posthog.init(key, {
			api_host: host || 'https://us.i.posthog.com',
			capture_pageview: false,
			capture_pageleave: true,
			persistence: 'localStorage'
		});

		this.initialized = true;
	}

	capturePageView(url: string) {
		if (!this.initialized) return;
		posthog.capture('$pageview', { $current_url: url });
	}

	captureEvent(event: string, properties?: Record<string, unknown>) {
		if (!this.initialized) return;
		posthog.capture(event, properties);
	}

	identifyPlayer(playerId: string, playerTag?: string) {
		if (!this.initialized) return;
		posthog.identify(playerId, playerTag ? { player_tag: playerTag } : undefined);
	}
}

export const posthogStore = new PostHogStore();
