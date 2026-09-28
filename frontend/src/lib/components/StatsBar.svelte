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
			<button class="stat-pill tag-pill" onclick={ontagclick} title="Click to change tag">
			{playerStore.tag || 'Set player tag'}
		</button>
	<span class="stat-pill">Played <b>{played}</b></span>
	<span class="stat-pill">Win rate <b>{winPct}</b></span>
	<span class="stat-pill">Streak <b>{streak}</b></span>
	<span class="stat-pill">Best <b>{bestTime}</b></span>
	<button class="leaderboard-btn" onclick={onleaderboard}>Leaderboard</button>
</div>

<style>
	.stats-bar { display: flex; align-items: center; justify-content: center; gap: 8px 24px; flex-wrap: wrap; padding: 16px 0; }
	.stat-pill { color: var(--muted); font-size: 11px; white-space: nowrap; }
	.stat-pill b { margin-left: 5px; color: var(--ink); font: 500 12px var(--mono); font-variant-numeric: tabular-nums; }
	.tag-pill, .leaderboard-btn { min-height: 44px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 11px; color: var(--ink); }
	.tag-pill:hover, .leaderboard-btn:hover { background: var(--surface-hover); }
	@media (max-width: 600px) { .stats-bar { gap: 12px 18px; } }
</style>
