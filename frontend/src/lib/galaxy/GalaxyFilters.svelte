<script lang="ts">
	import { galaxyStore, TECHNIQUE_FAMILIES, SECRET_FAMILIES, nodePrimaryFamily, nodePrimaryTechnique } from '$lib/stores/galaxy.svelte';
	import { playerStore } from '$lib/stores/player.svelte';

	interface FamilyCount {
		key: string;
		label: string;
		color: string;
		count: number;
		checked: boolean;
	}

	interface TechniqueCount {
		technique: string;
		color: string;
		count: number;
	}

	let families = $derived.by(() => {
		const result: FamilyCount[] = [];
		const counts: Record<string, number> = {};
		for (const key of Object.keys(TECHNIQUE_FAMILIES)) counts[key] = 0;

		for (const node of galaxyStore.nodes) {
			const family = nodePrimaryFamily(node);
			if (family && counts[family] !== undefined) counts[family]++;
		}

		for (const [key, fam] of Object.entries(TECHNIQUE_FAMILIES)) {
			if (!playerStore.secrets && SECRET_FAMILIES.has(key)) continue;
			result.push({
				key,
				label: fam.label,
				color: fam.color,
				count: counts[key],
				checked: galaxyStore.activeFilters.has(key)
			});
		}
		return result;
	});

	let techniqueCounts = $derived.by(() => {
		const fk = galaxyStore.focusedFamily;
		if (!fk) return [];
		const family = TECHNIQUE_FAMILIES[fk];
		if (!family) return [];

		const counts: Record<string, number> = {};
		for (const node of galaxyStore.nodes) {
			if (nodePrimaryFamily(node) !== fk) continue;
			const tech = nodePrimaryTechnique(node);
			counts[tech] = (counts[tech] || 0) + 1;
		}

		const result: TechniqueCount[] = [];
		for (const [tech, color] of Object.entries(family.techniques)) {
			if (counts[tech]) {
				result.push({ technique: tech, color, count: counts[tech] });
			}
		}
		return result;
	});
</script>

<div class="sidebar-section">
	{#if galaxyStore.focusedFamily}
		<button class="focus-back" onclick={() => galaxyStore.focusFamily(null)}>
			<span class="back-arrow">&larr;</span>
			<span>{TECHNIQUE_FAMILIES[galaxyStore.focusedFamily]?.label ?? ''}</span>
		</button>
		<div class="filter-group" style="margin-top: 8px;">
			{#each techniqueCounts as tech}
				<div class="filter-item technique-row">
					<span class="filter-swatch" style="background-color: {tech.color}"></span>
					<span class="filter-label">{tech.technique}</span>
					<span class="filter-count">{tech.count}</span>
				</div>
			{/each}
		</div>
	{:else}
		<h2>Technique Filters</h2><p class="filter-hint">Toggle a family to filter. Select its name to look closer.</p>
		<div class="filter-group">
			{#each families as fam}
				<div class="filter-item">
					<input
						type="checkbox"
						aria-label={`Show ${fam.label} puzzles`}
						checked={fam.checked}
						onchange={() => galaxyStore.toggleFilter(fam.key)}
					/>
					<span class="filter-swatch" style="background-color: {fam.color}"></span>
					<button type="button" class="filter-label filter-family-label"
						onclick={() => galaxyStore.focusFamily(fam.key)}

					>{fam.label}</button>
					<span class="filter-count">{fam.count}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	h2 { font: 500 16px var(--sans); letter-spacing: -0.02em; margin: 0 0 10px; }
	.filter-hint { font-size: 11px; color: var(--muted); line-height: 1.65; margin-bottom: 16px; }
	.filter-group { display: grid; gap: 4px; }
	.filter-item { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 8px; border-radius: 8px; }
	.filter-item:has(input:checked) { background: var(--grid); }
	.filter-item:hover { background: var(--surface-hover); }
	.filter-item input { width: 18px; height: 18px; margin: 0; accent-color: var(--accent); cursor: pointer; flex-shrink: 0; }
	.filter-swatch { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
	.filter-label { min-width: 0; font: 12px var(--sans); color: var(--ink); }
	.filter-family-label { border: 0; background: transparent; min-height: 44px; padding: 8px 0; text-align: left; flex: 1; }
	.filter-count { margin-left: auto; font: 10px var(--mono); color: var(--muted); }
	.focus-back { display: flex; align-items: center; gap: 10px; min-height: 44px; border: 0; background: transparent; padding: 0; color: var(--ink); font-size: 14px; }
	.back-arrow { color: var(--accent); }
</style>
