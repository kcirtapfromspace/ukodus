<script lang="ts">
	import { galaxyStore } from '$lib/stores/galaxy.svelte';
	import { apiClient } from '$lib/api/client';
	import type { LeaderboardEntry } from '$lib/api/types';

	let entries = $state<LeaderboardEntry[]>([]);
	let lbLoading = $state(false);
	let lbError = $state('');

	$effect(() => {
		const node = galaxyStore.selectedNode;
		if (node) {
			lbLoading = true;
			lbError = '';
			entries = [];
			apiClient
				.fetchLeaderboard({ puzzle_hash: node.puzzle_hash, limit: 10 })
				.then((data) => {
					if (galaxyStore.selectedNode !== node) return;
					entries = data;
					if (data.length === 0) lbError = 'No completions yet';
					lbLoading = false;
				})
				.catch(() => {
					if (galaxyStore.selectedNode !== node) return;
					lbError = '—';
					lbLoading = false;
				});
		}
	});

	function formatTime(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	let node = $derived(galaxyStore.selectedNode);
	let playUrl = $derived.by(() => {
		if (!node) return '#';
		const sc = node.short_code || '';
		return sc
			? `/play/?s=${encodeURIComponent(sc)}&from=galaxy`
			: `/play/?p=${encodeURIComponent(node.puzzle_string || '')}&from=galaxy`;
	});
</script>

<div class="sidebar-section">
	<h3>Selected Puzzle</h3>
	{#if node}
		<div class="detail-panel">
			<div class="detail-hash">{node.short_code || node.puzzle_hash || '---'}</div>
			<div class="detail-meta">
				<span>Difficulty <span class="val">{node.difficulty || '?'}</span></span>
				<span>SE Rating <span class="val">{node.se_rating != null ? node.se_rating.toFixed(1) : '?'}</span></span>
				<span>Plays <span class="val">{node.play_count || 0}</span></span>
				<span>Avg Time <span class="val">{node.avg_time_secs ? formatTime(node.avg_time_secs) : '--'}</span></span>
			</div>

			{#if node.techniques && node.techniques.length > 0}
				<div class="detail-techniques">
					{#each node.techniques as t}
						<span class="technique-tag">{t}</span>
					{/each}
				</div>
			{/if}

			<a class="detail-play-btn" href={playUrl}>Play This Puzzle</a>

			<div class="detail-leaderboard">
				<h4>Top Times</h4>
				{#if lbLoading}
					<div class="lb-empty">Loading...</div>
				{:else if lbError}
					<div class="lb-empty">{lbError}</div>
				{:else}
					<table>
						<thead>
							<tr><th>#</th><th>Player</th><th>Time</th><th>Hints</th><th>Errors</th></tr>
						</thead>
						<tbody>
							{#each entries as entry, i}
								<tr>
									<td>{i + 1}</td>
									<td>{entry.player_tag || (entry.player_id || '').slice(0, 8)}</td>
									<td>{formatTime(entry.time_secs || 0)}</td>
									<td>{entry.hints_used || 0}</td>
									<td>{entry.mistakes || 0}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	{:else}
		<div class="detail-panel empty">Click a node to see details</div>
	{/if}
</div>

<style>
	.sidebar-section h3 {
		font-family: var(--mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.8px;
		color: var(--faint);
		margin: 0 0 10px;
	}

	.detail-panel {
		padding: 14px;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.60);
	}

	:global([data-theme='dark'] .detail-panel) {
		border-color: rgba(255, 255, 255, 0.10);
		background: rgba(255, 255, 255, 0.06);
	}

	.detail-panel.empty {
		color: var(--faint);
		font-size: 13px;
		text-align: center;
		padding: 20px 14px;
	}

	.detail-hash {
		font-family: var(--mono);
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 8px;
		word-break: break-all;
	}

	.detail-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
		margin-bottom: 12px;
	}

	.detail-meta span {
		display: flex;
		justify-content: space-between;
	}

	.detail-meta :global(.val) {
		font-family: var(--mono);
		color: var(--ink);
	}

	.detail-techniques {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 12px;
	}

	.technique-tag {
		font-family: var(--mono);
		font-size: 10px;
		padding: 3px 7px;
		border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.70);
		color: var(--muted);
	}

	:global([data-theme='dark'] .technique-tag) {
		border-color: rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.08);
	}

	.detail-play-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 999px;
		border: 1px solid rgba(255, 59, 48, 0.30);
		background: linear-gradient(180deg, rgba(255, 59, 48, 0.10), rgba(255, 255, 255, 0.70));
		font-size: 13px;
		font-weight: 500;
		color: var(--ink);
		text-decoration: none;
		transition: transform 140ms ease, box-shadow 140ms ease;
		cursor: pointer;
	}

	:global([data-theme='dark'] .detail-play-btn) {
		border-color: rgba(255, 59, 48, 0.35);
		background: linear-gradient(180deg, rgba(255, 59, 48, 0.18), rgba(255, 255, 255, 0.06));
	}

	.detail-play-btn:hover {
		text-decoration: none;
		transform: translateY(-1px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
	}

	.detail-leaderboard {
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid rgba(20, 20, 20, 0.08);
	}

	:global([data-theme='dark'] .detail-leaderboard) {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	.detail-leaderboard h4 {
		font-family: var(--mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--faint);
		margin: 0 0 8px;
	}

	.detail-leaderboard table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--mono);
		font-size: 12px;
	}

	.detail-leaderboard th {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		color: var(--faint);
		font-weight: 500;
		padding: 4px 6px;
		text-align: left;
		border-bottom: 1px solid rgba(20, 20, 20, 0.10);
	}

	:global([data-theme='dark'] .detail-leaderboard th) {
		border-bottom-color: rgba(255, 255, 255, 0.10);
	}

	.detail-leaderboard td {
		padding: 4px 6px;
		color: var(--ink);
		border-bottom: 1px solid rgba(20, 20, 20, 0.04);
	}

	:global([data-theme='dark'] .detail-leaderboard td) {
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.lb-empty {
		text-align: center;
		color: var(--faint);
		font-size: 12px;
		font-style: italic;
		padding: 8px 0;
	}
</style>
