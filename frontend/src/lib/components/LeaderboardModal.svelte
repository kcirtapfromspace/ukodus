<script lang="ts">
	import { modalFocus } from '$lib/actions/modalFocus';
	import { playerStore } from '$lib/stores/player.svelte';
	import { apiClient } from '$lib/api/client';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import type { LeaderboardEntry } from '$lib/api/types';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	const difficulties = ['Beginner', 'Easy', 'Medium', 'Intermediate', 'Hard', 'Expert'];
	const secretDifficulties = ['Master', 'Extreme'];

	let activeDiff = $state('Beginner');
	let entries = $state<LeaderboardEntry[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');
	let requestId = 0;

	$effect(() => {
		if (open) {
			posthogStore.captureEvent('leaderboard_viewed', { difficulty: activeDiff });
			fetchData(activeDiff);
		} else { requestId++; }
	});

	async function fetchData(difficulty: string) {
		const request = ++requestId;
		loading = true;
		errorMsg = '';
		entries = [];
		try {
			const result = await apiClient.fetchLeaderboard({ difficulty, limit: 20 });
			if (request !== requestId) return;
			entries = result;
			if (entries.length === 0) errorMsg = 'No results yet for this difficulty.';
		} catch {
			if (request !== requestId) return;
			errorMsg = 'Could not load leaderboard.';
		}
		loading = false;
	}

	function selectDiff(diff: string) {
		activeDiff = diff;
	}

	function formatTime(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return m + ':' + String(s).padStart(2, '0');
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { e.stopPropagation(); onclose(); }
	}
</script>



{#if open}
	<div class="lb-overlay" onclick={handleBackdropClick} onkeydown={handleKeydown} role="dialog" aria-modal="true" aria-labelledby="leaderboard-title" tabindex="-1" use:modalFocus={onclose}>
		<div class="lb-panel">
			<div class="lb-header">
				<div><p class="dialog-kicker">A little friendly competition</p><h2 id="leaderboard-title">Leaderboard</h2></div>
				<button class="lb-close" onclick={onclose} aria-label="Close">&times;</button>
			</div>
			<div class="lb-tabs">
				{#each difficulties as diff}
					<button
						class="lb-tab"
						class:active={activeDiff === diff}
						aria-pressed={activeDiff === diff}
						onclick={() => selectDiff(diff)}
					>{diff}</button>
				{/each}
				{#if playerStore.secrets}
					{#each secretDifficulties as diff}
						<button
							class="lb-tab"
							class:active={activeDiff === diff}
						aria-pressed={activeDiff === diff}
							onclick={() => selectDiff(diff)}
						>{diff}</button>
					{/each}
				{/if}
			</div>
			<div class="lb-body" aria-live="polite" aria-busy={loading}>
				{#if loading}
					<div class="lb-empty">Loading...</div>
				{:else if errorMsg}
					<div class="lb-empty">{errorMsg}</div>
				{:else}
					<table class="lb-table data-table">
						<thead>
							<tr>
								<th>Rank</th>
								<th>Player</th>
								<th>Time</th>
								<th>Hints</th>
								<th>Errors</th>
							</tr>
						</thead>
						<tbody>
							{#each entries as entry, i}
								<tr class:me={entry.player_id === playerStore.id}>
									<td class="rank">{i + 1}</td>
									<td class="player">{entry.player_tag || (entry.player_id || '').slice(0, 8)}</td>
									<td class="time">{formatTime(entry.time_secs)}</td>
									<td>{entry.hints_used}</td>
									<td>{entry.mistakes}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.lb-overlay { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 20px; background: #18151080; backdrop-filter: blur(6px); }
	.lb-panel { width: min(600px, 100%); max-height: calc(100dvh - 40px); overflow: hidden; display: flex; flex-direction: column; background: var(--paper2); border: 1px solid var(--border); border-radius: 20px; box-shadow: var(--shadow); }
	.lb-header { display: flex; align-items: start; justify-content: space-between; gap: 20px; padding: 28px 28px 20px; }
	.dialog-kicker { color: var(--muted); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 12px; }
	h2 { margin: 0; font-size: 32px; }
	.lb-close { display: grid; place-items: center; min-width: 44px; height: 44px; border: 1px solid var(--border); background: transparent; color: var(--ink); border-radius: 8px; font-size: 24px; }
	.lb-close:hover { background: var(--surface-hover); }
	.lb-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 28px 24px; }
	.lb-tab { min-height: 40px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 7px; background: transparent; font-size: 11px; }
	.lb-tab:hover { background: var(--surface-hover); }
	.lb-tab.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
	.lb-body { overflow: auto; padding: 0 20px 20px; min-height: 160px; }
	.lb-table { min-width: 390px; }
	.lb-table td, .lb-table th { padding: 12px 8px; }
	.lb-table tr.me { background: var(--accent-soft); }
	.lb-table tr.me td { color: var(--accent); font-weight: 600; }
	.rank, .player, .time { font-family: var(--mono); font-size: 12px; font-variant-numeric: tabular-nums; }
	.lb-empty { padding: 40px 20px; color: var(--muted); font-size: 14px; text-align: center; }
	@media (max-width: 420px) { .lb-overlay { padding: 12px; } .lb-header { padding: 24px 20px 20px; } .lb-tabs { padding-inline: 20px; } .lb-body { padding-inline: 12px; } }
</style>
