<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import GameCanvas from '$lib/game/GameCanvas.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import PlayerTagModal from '$lib/components/PlayerTagModal.svelte';
	import LeaderboardModal from '$lib/components/LeaderboardModal.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import type { SudokuGame } from '$lib/wasm/loader';

	let game = $state<SudokuGame | null>(null);
	let statsBar: StatsBar;
	let showTag = $state(!playerStore.tag);
	let showLeaderboard = $state(false);

	let statsInterval: ReturnType<typeof setInterval> | null = null;

	function onGameReady(g: SudokuGame) {
		game = g;
		statsBar?.refresh();
		statsInterval = setInterval(() => statsBar?.refresh(), 5000);
	}

	function openTag() { showTag = true; }
	function closeTag() { showTag = false; }

	function openLeaderboard() { showLeaderboard = true; }
	function closeLeaderboard() { showLeaderboard = false; }
</script>

<SeoHead
	title="Ukodus — Play Sudoku"
	description="Play Sudoku in the browser, powered by a Rust WASM engine. Unique puzzles, human-style difficulty, keyboard-driven."
	url="https://ukodus.now/play/"
	image="https://ukodus.now/assets/og-play.png"
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Ukodus — Play Sudoku',
		url: 'https://ukodus.now/play/',
		applicationCategory: 'GameApplication',
		operatingSystem: 'Web',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	}}
/>

<div class="play-layout" id="game-container">
	<nav class="play-nav" aria-label="Game navigation">
		<a class="play-nav-brand" href="/" aria-label="Ukodus home">
			<img src="/assets/app-icon.png" alt="" width="24" height="24" />
			<strong>Ukodus</strong>
		</a>
		<div class="play-nav-links">
			<a href="/">Home</a>
			<a href="/galaxy/">Galaxy</a>
			<a href="/app/">App</a>
		</div>
		<div class="play-nav-actions">
			<ThemeToggle />
			<ShareButton {game} />
		</div>
	</nav>

	<GameCanvas onready={onGameReady} />

	<div id="stats-bar">
		<StatsBar bind:this={statsBar} {game} ontagclick={openTag} onleaderboard={openLeaderboard} />
	</div>
</div>

<PlayerTagModal open={showTag} onclose={closeTag} />
<LeaderboardModal open={showLeaderboard} onclose={closeLeaderboard} />

<style>
	.play-layout {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100dvh;
		min-height: 0;
	}
	:global(html:has(.play-layout)), :global(body:has(.play-layout)) {
		height: 100dvh;
		overflow: hidden;
	}
	.play-nav {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 6px 16px;
		background: var(--surface, #fff);
		border-bottom: 1px solid var(--border, rgba(0,0,0,0.08));
		font-size: 13px;
	}
	.play-nav-brand {
		display: flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--ink, #1a1a1a);
		font-size: 14px;
	}
	.play-nav-links {
		display: flex;
		gap: 12px;
	}
	.play-nav-links a {
		color: var(--faint, #888);
		text-decoration: none;
		transition: color 0.15s;
	}
	.play-nav-links a:hover {
		color: var(--ink, #1a1a1a);
	}
	.play-nav-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
