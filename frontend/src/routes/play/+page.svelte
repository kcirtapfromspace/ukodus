<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import GameCanvas from '$lib/game/GameCanvas.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import PlayerTagModal from '$lib/components/PlayerTagModal.svelte';
	import LeaderboardModal from '$lib/components/LeaderboardModal.svelte';
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
		grid-template-rows: 1fr auto;
		height: 100dvh;
		min-height: 0;
	}
	:global(html:has(.play-layout)), :global(body:has(.play-layout)) {
		height: 100dvh;
		overflow: hidden;
	}
</style>
