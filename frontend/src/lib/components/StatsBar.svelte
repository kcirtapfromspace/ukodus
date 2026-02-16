<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';
	import type { SudokuGame } from '$lib/wasm/loader';

	interface Props {
		game: SudokuGame | null;
		ontagclick: () => void;
		onleaderboard: () => void;
	}

	let { game, ontagclick, onleaderboard }: Props = $props();

	let played = $state(0);
	let winPct = $state('0%');
	let streak = $state(0);
	let bestTime = $state('--:--');

	export function refresh() {
		if (!game) return;
		try {
			const raw = game.get_stats_json();
			if (!raw) return;
			const stats = JSON.parse(raw);
			played = stats.games_played || 0;
			const pct = stats.games_played > 0 ? Math.round((stats.games_won / stats.games_played) * 100) : 0;
			winPct = pct + '%';
			streak = stats.current_streak || 0;
			if (stats.best_time && stats.best_time < 999999) {
				const m = Math.floor(stats.best_time / 60);
				const s = stats.best_time % 60;
				bestTime = m + ':' + String(s).padStart(2, '0');
			} else {
				bestTime = '--:--';
			}
		} catch { /* stats not available */ }
	}
</script>

<div class="stats-bar">
	{#if playerStore.tag}
		<button class="stat-pill tag-pill" onclick={ontagclick} title="Click to change tag">
			{playerStore.tag}
		</button>
	{/if}
	<span class="stat-pill">Played <b>{played}</b></span>
	<span class="stat-pill">Win% <b>{winPct}</b></span>
	<span class="stat-pill">Streak <b>{streak}</b></span>
	<span class="stat-pill">Best <b>{bestTime}</b></span>
	<button class="leaderboard-btn" onclick={onleaderboard}>Leaderboard</button>
</div>

<style>
	.stats-bar {
		display: flex; align-items: center; justify-content: center;
		gap: 10px; padding: 8px 16px; flex-wrap: wrap;
	}
	.stat-pill {
		font-family: var(--mono); font-size: 11px;
		padding: 5px 10px; border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.50);
		color: var(--muted); white-space: nowrap;
	}
	.stat-pill b { color: var(--ink); font-weight: 600; }
	.tag-pill {
		cursor: pointer;
		transition: transform 140ms ease, background 140ms ease;
		font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
	}
	.tag-pill:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.75); }
	.leaderboard-btn {
		font-family: var(--mono); font-size: 11px;
		padding: 5px 12px; border-radius: 999px;
		border: 1px solid rgba(10, 132, 255, 0.25);
		background: linear-gradient(180deg, rgba(10, 132, 255, 0.08), rgba(255, 255, 255, 0.55));
		cursor: pointer; transition: transform 140ms ease, background 140ms ease;
		color: var(--accent2, #0a84ff); font-weight: 600;
	}
	.leaderboard-btn:hover {
		transform: translateY(-1px);
		background: linear-gradient(180deg, rgba(10, 132, 255, 0.14), rgba(255, 255, 255, 0.85));
	}
</style>
