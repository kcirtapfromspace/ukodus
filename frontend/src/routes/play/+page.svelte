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
	<header class="topbar" id="topbar">
		<div class="wrap topbar-inner">
			<a class="brand" href="/" aria-label="Ukodus home">
				<img src="/assets/app-icon.png" alt="" width="34" height="34" />
				<div class="wordmark">
					<strong>Ukodus</strong>
					<span>Play Sudoku</span>
				</div>
			</a>
			<nav aria-label="Primary">
				<a class="navlink" href="/">Home</a>
				<a class="navlink" href="/galaxy/">Galaxy</a>
				<a class="navlink" href="/app/">App</a>
				<div class="controls-row">
					<ThemeToggle />
					<span class="controls-sep"></span>
					<ShareButton {game} />
				</div>
			</nav>
		</div>
	</header>

	<GameCanvas onready={onGameReady} />

	<div id="stats-bar">
		<StatsBar bind:this={statsBar} {game} ontagclick={openTag} onleaderboard={openLeaderboard} />
	</div>

	<footer class="play-footer" id="play-footer">
		<span>Rust + WebAssembly</span>
		<span>&middot;</span>
		<a href="/galaxy/">Explore Galaxy</a>
		<span>&middot;</span>
		<a href="https://apps.apple.com/us/app/sudoku/id6758485043">iOS App</a>
		<span>&middot;</span>
		<a href="/privacy/">Privacy</a>
		<span>&middot;</span>
		<a href="https://github.com/kcirtapfromspace/sudoku-core" target="_blank">Source</a>
	</footer>
</div>

<PlayerTagModal open={showTag} onclose={closeTag} />
<LeaderboardModal open={showLeaderboard} onclose={closeLeaderboard} />

<style>
	.play-layout {
		display: grid;
		grid-template-rows: auto 1fr auto auto;
		height: 100dvh;
		min-height: 0;
	}
	:global(html:has(.play-layout)), :global(body:has(.play-layout)) {
		height: 100dvh;
		overflow: hidden;
	}
	.controls-row { display: flex; align-items: center; gap: 8px; }
	.controls-sep { width: 1px; height: 18px; background: rgba(20, 20, 20, 0.10); margin: 0 4px; }
	.play-footer {
		display: flex; align-items: center; justify-content: center;
		gap: 12px; padding: 8px 16px;
		font-size: 12px; color: var(--faint); flex-wrap: wrap;
	}
	.play-footer a { color: var(--accent2, #0a84ff); }
</style>
