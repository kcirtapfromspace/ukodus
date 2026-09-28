<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Initialize theme
		themeStore;
		// Initialize player
		playerStore;
		// Apply secrets class
		if (playerStore.secrets) {
			document.body.classList.add('secrets-unlocked');
		}
		// Initialize PostHog
		posthogStore.init();
		if (playerStore.id) {
			posthogStore.identifyPlayer(playerStore.id, playerStore.tag || undefined);
		}
	});

	afterNavigate(({ to }) => {
		if (to?.url) {
			posthogStore.capturePageView(to.url.href);
		}
	});
</script>

<div class:sky-shell={page.url.pathname.startsWith('/galaxy')}>
<a class="skip-link" href="#main-content">Skip to content</a>
<Header />

{@render children()}

<Footer />
</div>

<style>
 .sky-shell { color-scheme: dark; min-height: 100dvh; color: var(--ink); background: #080d15; --paper: #080d15; --paper2: #101a29; --ink: #e6eef9; --muted: #9cacc3; --faint: #8da1bd; --grid: #a3b9d810; --grid-strong: #a3b9d828; --border: #93abc533; --surface: #0f1928; --surface-hover: #1c2c42; --accent: #ccdef5; --accent2: #aac9f0; --focus: #c3defe; }
 :global([data-theme='high-contrast']) .sky-shell { --ink: #fff; --muted: #e0ebfa; --faint: #c8d9ef; --border: #bed5f299; --grid-strong: #bed5f266; }
</style>
