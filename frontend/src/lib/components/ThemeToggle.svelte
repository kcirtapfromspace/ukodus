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
		font-family: var(--mono);
		font-size: 11px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.12);
		background: rgba(255, 255, 255, 0.55);
		cursor: pointer;
		transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
		color: var(--ink);
	}

	.theme-toggle:hover {
		transform: translateY(-1px);
		background: rgba(255, 255, 255, 0.92);
		border-color: rgba(20, 20, 20, 0.16);
	}

	:global([data-theme='dark']) .theme-toggle {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.06);
	}

	:global([data-theme='dark']) .theme-toggle:hover {
		background: rgba(255, 255, 255, 0.12);
	}
</style>
