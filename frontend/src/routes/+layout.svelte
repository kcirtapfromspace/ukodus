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

	let isPlayPage = $derived(page.url.pathname.startsWith('/play'));

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

{#if !isPlayPage}
	<Header />
{/if}

{@render children()}

{#if !isPlayPage}
	<Footer />
{/if}
