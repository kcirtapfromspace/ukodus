<script lang="ts">
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

	$effect(() => {
		if (open) {
			posthogStore.captureEvent('leaderboard_viewed', { difficulty: activeDiff });
			fetchData(activeDiff);
		}
	});

	async function fetchData(difficulty: string) {
		loading = true;
		errorMsg = '';
		entries = [];
		try {
			entries = await apiClient.fetchLeaderboard({ difficulty, limit: 20 });
			if (entries.length === 0) errorMsg = 'No results yet for this difficulty.';
		} catch {
			errorMsg = 'Could not load leaderboard.';
		}
		loading = false;
	}

	function selectDiff(diff: string) {
		activeDiff = diff;
		fetchData(diff);
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
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div class="lb-overlay" onclick={handleBackdropClick} onkeydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
		<div class="lb-panel">
			<div class="lb-header">
				<h2>Leaderboard</h2>
				<button class="lb-close" onclick={onclose} aria-label="Close">&times;</button>
			</div>
			<div class="lb-tabs">
				{#each difficulties as diff}
					<button
						class="lb-tab"
						class:active={activeDiff === diff}
						onclick={() => selectDiff(diff)}
					>{diff}</button>
				{/each}
				{#if playerStore.secrets}
					{#each secretDifficulties as diff}
						<button
							class="lb-tab"
							class:active={activeDiff === diff}
							onclick={() => selectDiff(diff)}
						>{diff}</button>
					{/each}
				{/if}
			</div>
			<div class="lb-body">
				{#if loading}
					<div class="lb-empty">Loading...</div>
				{:else if errorMsg}
					<div class="lb-empty">{errorMsg}</div>
				{:else}
					<table class="lb-table">
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
	.lb-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: rgba(20, 20, 20, 0.4);
		backdrop-filter: blur(8px);
		display: flex; align-items: center; justify-content: center;
	}
	.lb-panel {
		width: min(560px, calc(100vw - 32px));
		max-height: calc(100dvh - 64px);
		background: var(--paper2, #fff);
		border-radius: var(--radius);
		border: 1px solid rgba(20, 20, 20, 0.12);
		box-shadow: var(--shadow, 0 12px 40px rgba(0, 0, 0, 0.1));
		display: flex; flex-direction: column; overflow: hidden;
	}
	.lb-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 16px 20px 12px;
		border-bottom: 1px solid rgba(20, 20, 20, 0.08);
	}
	.lb-header h2 { font-family: var(--serif); font-size: 20px; margin: 0; }
	.lb-close {
		width: 32px; height: 32px; border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.55);
		cursor: pointer; font-size: 18px;
		display: flex; align-items: center; justify-content: center;
		color: var(--muted); transition: background 140ms ease;
	}
	.lb-close:hover { background: rgba(255, 255, 255, 0.92); }
	.lb-tabs {
		display: flex; gap: 6px; padding: 10px 20px;
		overflow-x: auto; flex-wrap: wrap;
	}
	.lb-tab {
		font-family: var(--mono); font-size: 11px;
		padding: 5px 10px; border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.12);
		background: rgba(255, 255, 255, 0.55);
		cursor: pointer; transition: background 140ms ease, border-color 140ms ease;
		white-space: nowrap; color: var(--ink);
	}
	.lb-tab:hover { background: rgba(255, 255, 255, 0.92); }
	.lb-tab.active {
		border-color: rgba(10, 132, 255, 0.35);
		background: linear-gradient(180deg, rgba(10, 132, 255, 0.12), rgba(255, 255, 255, 0.70));
	}
	.lb-body { flex: 1; overflow-y: auto; padding: 0 20px 16px; }
	.lb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.lb-table th {
		font-family: var(--mono); font-size: 11px;
		text-transform: uppercase; letter-spacing: 0.5px;
		color: var(--faint); text-align: left;
		padding: 8px 6px; border-bottom: 1px solid rgba(20, 20, 20, 0.08);
		font-weight: 600;
	}
	.lb-table td {
		padding: 8px 6px;
		border-bottom: 1px solid rgba(20, 20, 20, 0.04);
		color: var(--muted);
	}
	.lb-table tr.me td { color: var(--accent2, #0a84ff); font-weight: 600; }
	.rank { font-family: var(--mono); font-weight: 700; color: var(--ink); width: 36px; }
	.player {
		max-width: 120px; overflow: hidden; text-overflow: ellipsis;
		white-space: nowrap; font-family: var(--mono); font-size: 12px;
	}
	.time { font-family: var(--mono); font-weight: 600; }
	.lb-empty { text-align: center; padding: 32px 16px; color: var(--faint); font-size: 14px; }
</style>
