<script lang="ts">
	import { galaxyStore, TECHNIQUE_FAMILIES, SECRET_FAMILIES } from '$lib/stores/galaxy.svelte';
	import { playerStore } from '$lib/stores/player.svelte';

	let visibleTechniques = $derived.by(() => {
		const vis = new Set<string>();
		for (const [fk, fam] of Object.entries(TECHNIQUE_FAMILIES)) {
			if (playerStore.secrets || !SECRET_FAMILIES.has(fk)) {
				for (const t of Object.keys(fam.techniques)) vis.add(t);
			}
		}
		return vis;
	});

	let observedCount = $derived.by(() => {
		const observed = new Set<string>();
		for (const node of galaxyStore.nodes) {
			if (node.techniques) {
				for (const t of node.techniques) {
					if (visibleTechniques.has(t)) observed.add(t);
				}
			}
		}
		return observed.size;
	});

	let pct = $derived(
		visibleTechniques.size > 0 ? Math.round((observedCount / visibleTechniques.size) * 100) : 0
	);
</script>

<div class="sidebar-section">
	<h3>Galaxy Stats</h3>
	<div class="stats-grid">
		<div class="stat-item">
			<div class="stat-value">{galaxyStore.stats?.total_puzzles?.toLocaleString() ?? '--'}</div>
			<div class="stat-label">puzzles</div>
		</div>
		<div class="stat-item">
			<div class="stat-value">{galaxyStore.stats?.total_plays?.toLocaleString() ?? '--'}</div>
			<div class="stat-label">plays</div>
		</div>
		<div class="stat-item">
			<div class="stat-value">{observedCount} / {visibleTechniques.size}</div>
			<div class="stat-label">techniques</div>
		</div>
		<div class="stat-item">
			<div class="stat-value">{pct}%</div>
			<div class="stat-label">explored</div>
		</div>
	</div>
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

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.stat-item {
		padding: 10px;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(20, 20, 20, 0.08);
		background: rgba(255, 255, 255, 0.50);
	}

	:global([data-theme='dark'] .stat-item) {
		border-color: rgba(255, 255, 255, 0.10);
		background: rgba(255, 255, 255, 0.06);
	}

	.stat-value {
		font-family: var(--mono);
		font-size: 18px;
		font-weight: 600;
		color: var(--ink);
		line-height: 1;
	}

	.stat-label {
		font-size: 11px;
		color: var(--faint);
		margin-top: 4px;
	}

	@media (max-width: 640px) {
		.stats-grid { grid-template-columns: 1fr; }
	}
</style>
