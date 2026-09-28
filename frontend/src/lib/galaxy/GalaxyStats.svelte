<script lang="ts">
	import { galaxyStore, TECHNIQUE_FAMILIES, SECRET_FAMILIES, canonicalTechniqueName } from '$lib/stores/galaxy.svelte';
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
					const technique = canonicalTechniqueName(t);
					if (visibleTechniques.has(technique)) observed.add(technique);
				}
			}
		}
		return observed.size;
	});

	let pct = $derived(
		visibleTechniques.size > 0 ? Math.round((observedCount / visibleTechniques.size) * 100) : 0
	);
</script>

<section class="galaxy-stats" aria-label="Galaxy statistics">

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
			<div class="stat-label">techniques seen</div>
		</div>
		<div class="stat-item">
			<div class="stat-value">{pct}%</div>
			<div class="stat-label">technique coverage</div>
		</div>
	</div>
	<p class="stats-note">Coverage is the share of unlocked solving techniques found in the loaded puzzles.</p>
</section>

<style>
 .galaxy-stats { padding: 32px 20px 0; }
 .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
 .stat-item { padding-right: 24px; border-right: 1px solid var(--border); }
 .stat-item:last-child { border-right: 0; }
 .stat-value { font: 400 24px var(--mono); letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
 .stat-label { margin-top: 8px; color: var(--muted); font-size: 11px; }
 .stats-note { color: var(--faint); font-size: 10px; line-height: 1.7; margin: 24px 0 0; }
 @media (max-width: 640px) { .galaxy-stats { padding-inline: 12px; } .stats-grid { grid-template-columns: 1fr 1fr; gap: 28px; } .stat-item:nth-child(2) { border-right: 0; } .stat-value { font-size: 23px; } }
</style>
