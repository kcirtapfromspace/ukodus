<script lang="ts">
	import { galaxyStore, nodePrimaryTechnique } from '$lib/stores/galaxy.svelte';
	import { techniqueLabel } from './celestial';
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
					lbError = 'Could not load times. Please try again later.';
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
	<h2>Selected puzzle</h2>
	{#if node}
		<div class="detail-panel" aria-live="polite">
			<div class="detail-hash">{node.short_code || node.puzzle_hash || '---'}</div>
			<div class="detail-meta">
				<span>Primary technique <span class="val">{techniqueLabel(nodePrimaryTechnique(node))}</span></span>
				<span>Difficulty <span class="val">{node.difficulty || '?'}</span></span>
				<span>SE Rating <span class="val">{node.se_rating != null ? node.se_rating.toFixed(1) : '?'}</span></span>
				<span>Plays <span class="val">{node.play_count || 0}</span></span>
				<span>Avg Time <span class="val">{node.avg_time_secs ? formatTime(node.avg_time_secs) : '--'}</span></span>
			</div>

			{#if node.techniques && node.techniques.length > 0}
				<div class="detail-techniques">
					{#each node.techniques as t}
						<span class="technique-tag">{techniqueLabel(t)}</span>
					{/each}
				</div>
			{/if}

			<a class="btn primary detail-play-btn" href={playUrl}>Play This Puzzle</a>

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
		<div class="detail-panel empty"><span class="empty-mark" aria-hidden="true">↗</span><strong>Find a puzzle that catches your eye.</strong><p>Click a node to see details</p><span>Its techniques, difficulty, and best times will appear here.</span></div>
	{/if}
</div>

<style>
	h2 { margin: 0 0 14px; font: 500 16px var(--sans); }
	.detail-panel { padding: 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
	.detail-panel.empty { border-style: dashed; }
	.empty-mark { display: block; color: var(--accent); font-size: 24px; margin-bottom: 20px; }
	.empty strong { font-size: 14px; font-weight: 500; line-height: 1.5; display: block; }
	.empty p, .empty > span:last-child { color: var(--muted); font-size: 12px; line-height: 1.7; }
	.detail-hash { font: 500 15px var(--mono); overflow-wrap: anywhere; margin-bottom: 20px; }
	.detail-meta { display: grid; gap: 12px; font-size: 11px; color: var(--muted); }
	.detail-meta > span { display: flex; justify-content: space-between; gap: 12px; }
	.detail-meta :global(.val) { font-family: var(--mono); color: var(--ink); }
	.detail-meta .val { text-align: right; overflow-wrap: anywhere; }
	.detail-techniques { display: flex; flex-wrap: wrap; gap: 6px; margin: 20px 0; }
	.technique-tag { padding: 5px 7px; border: 1px solid var(--border); border-radius: 5px; font-size: 10px; overflow-wrap: anywhere; }
	.detail-play-btn { margin-top: 20px; width: 100%; }
	.detail-leaderboard { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border); overflow-x: auto; }
	.detail-leaderboard h4 { font-size: 12px; font-weight: 500; margin: 0 0 12px; }
	table { border-collapse: collapse; width: 100%; font: 10px var(--mono); }
	th { font-size: 9px; font-weight: 400; color: var(--muted); text-align: left; }
	td, th { padding: 8px 4px; border-bottom: 1px solid var(--grid-strong); }
	.lb-empty { font-size: 12px; color: var(--muted); line-height: 1.7; padding: 12px 0; }
</style>
