<script lang="ts">
	import { onDestroy } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import GameCanvas from '$lib/game/GameCanvas.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import PlayerTagModal from '$lib/components/PlayerTagModal.svelte';
	import LeaderboardModal from '$lib/components/LeaderboardModal.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import type { SudokuGame } from '$lib/wasm/loader';

	let game = $state<SudokuGame | null>(null);
	let statsBar: StatsBar;
	let showTag = $state(false);
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

	onDestroy(() => {
		if (statsInterval !== null) clearInterval(statsInterval);
	});
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

<main class="wrap play-layout" id="main-content" tabindex="-1">
	<header class="play-toolbar" id="play-toolbar"><div><p class="kicker">A little space to think</p><h1>Play Sudoku</h1></div><div class="play-actions"><a href="/how-to-play/">Controls &amp; hints ↗</a><div class="game-share"><ShareButton {game} /></div></div></header>
	<div id="game-container">
	<GameCanvas onready={onGameReady} />

	</div>
	<div id="stats-bar">
		<StatsBar bind:this={statsBar} {game} ontagclick={openTag} onleaderboard={openLeaderboard} />
	</div>
</main>

<PlayerTagModal open={showTag} onclose={closeTag} />
<LeaderboardModal open={showLeaderboard} onclose={closeLeaderboard} />

<style>
	.play-layout { padding-block: 28px 36px; }
	.play-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
	.play-toolbar .kicker { margin-bottom: 8px; font-size: 10px; }
	h1 { font-size: 32px; margin: 0; }
	.play-actions { display: flex; align-items: center; gap: 24px; }
	.play-actions a { font-size: 12px; min-height: 44px; display: inline-flex; align-items: center; }
	#stats-bar { margin-top: 8px; }
	@media (max-width: 600px) { .play-toolbar { align-items: start; gap: 20px; flex-direction: column; } .play-actions { width: 100%; justify-content: space-between; } }
	@media (max-width: 639px) { .game-share { display: none; } }
</style>
