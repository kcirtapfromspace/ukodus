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
		<h3>Technique Filters</h3>
		<div class="filter-group">
			{#each families as fam}
				<label class="filter-item" >
					<input
						type="checkbox"
						checked={fam.checked}
						onchange={() => galaxyStore.toggleFilter(fam.key)}
					/>
					<span class="filter-swatch" style="background-color: {fam.color}"></span>
					<span class="filter-label filter-family-label" role="button" tabindex="0"
						onclick={() => galaxyStore.focusFamily(fam.key)}
						onkeydown={(e) => { if (e.key === 'Enter') galaxyStore.focusFamily(fam.key); }}
					>{fam.label}</span>
					<span class="filter-count">{fam.count}</span>
				</label>
			{/each}
		</div>
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

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.filter-item {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		font-size: 13px;
		padding: 4px 0;
		user-select: none;
	}

	.filter-item input[type="checkbox"] {
		appearance: none;
		width: 16px;
		height: 16px;
		border: 1.5px solid rgba(20, 20, 20, 0.20);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.60);
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
		transition: border-color 140ms ease, background 140ms ease;
	}

	.filter-item input[type="checkbox"]:checked {
		border-color: rgba(20, 20, 20, 0.40);
		background: rgba(255, 255, 255, 0.90);
	}

	.filter-item input[type="checkbox"]:checked::after {
		content: "";
		position: absolute;
		top: 2px;
		left: 5px;
		width: 4px;
		height: 8px;
		border: solid var(--ink);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}

	.filter-swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.filter-label {
		color: var(--muted);
	}

	.filter-count {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--faint);
		margin-left: auto;
	}

	.filter-family-label {
		cursor: pointer;
	}

	.filter-family-label:hover {
		color: var(--ink);
	}

	.focus-back {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--mono);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--muted);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.focus-back:hover {
		color: var(--ink);
	}

	.back-arrow {
		font-size: 14px;
	}

	.technique-row {
		cursor: default;
	}

	@media (max-width: 940px) {
		:global(.sidebar-section) {
			flex: 1;
			min-width: 200px;
		}
	}
</style>
