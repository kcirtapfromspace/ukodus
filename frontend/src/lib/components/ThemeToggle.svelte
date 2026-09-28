<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';

	const labels: Record<string, string> = {
		light: 'Light',
		dark: 'Dark',
		'high-contrast': 'Hi-Con'
	};

	function handleClick() {
		themeStore.cycle();
		posthogStore.captureEvent('theme_changed', { theme: themeStore.current });
	}
</script>

<button class="theme-toggle" onclick={handleClick} aria-label="Toggle theme: {themeStore.current}">
	{labels[themeStore.current]}
</button>

<style>
	.theme-toggle {
		min-height: 44px;
		min-width: 60px;
		font: 11px var(--mono);
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid var(--grid-strong);
		background: transparent;
		cursor: pointer;
		transition: background 180ms ease;
		color: var(--muted);
	}
	.theme-toggle:hover { background: var(--grid-strong); color: var(--ink); }
	.theme-toggle:active { transform: translateY(1px); }
</style>
