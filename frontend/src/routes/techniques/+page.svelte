<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { playerStore } from '$lib/stores/player.svelte';

	interface Technique { name: string; se: string; tier: string; tierClass: string; secret?: boolean; desc?: string; }
	interface Family { id: string; label: string; color: string; desc: string; techniques: Technique[]; secret?: boolean; }

	const families: Family[] = [
		{
			id: 'singles', label: 'Singles', color: '#22c55e',
			desc: 'The foundation of all Sudoku solving. A single is a cell or candidate that can be determined directly, with no complex reasoning required.',
			techniques: [
				{ name: 'Hidden Single', se: '1.5', tier: 'Beginner', tierClass: 'tier-beginner' },
				{ name: 'Naked Single', se: '2.3', tier: 'Easy', tierClass: 'tier-easy' },
			]
		},
		{
			id: 'pairs-triples', label: 'Pairs & Triples', color: '#10b981',
			desc: 'Subset techniques that identify groups of candidates locked within a set of cells.',
			techniques: [
				{ name: 'Naked Pair', se: '3.0', tier: 'Intermediate', tierClass: 'tier-intermediate' },
				{ name: 'Hidden Pair', se: '3.4', tier: 'Intermediate', tierClass: 'tier-intermediate' },
				{ name: 'Naked Triple', se: '3.6', tier: 'Intermediate', tierClass: 'tier-intermediate' },
				{ name: 'Hidden Triple', se: '3.8', tier: 'Hard', tierClass: 'tier-hard' },
				{ name: 'Naked Quad', se: '5.0', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Hidden Quad', se: '5.4', tier: 'Master', tierClass: 'tier-master', secret: true },
			]
		},
		{
			id: 'intersections', label: 'Intersections', color: '#f59e0b',
			desc: 'When candidates for a digit in a box are confined to a single row or column (or vice versa), the intersection eliminates candidates elsewhere.',
			techniques: [
				{ name: 'Pointing Pair', se: '2.6', tier: 'Medium', tierClass: 'tier-medium' },
				{ name: 'Box/Line Reduction', se: '2.8', tier: 'Hard', tierClass: 'tier-hard' },
			]
		},
		{
			id: 'fish', label: 'Fish', color: '#0284c7',
			desc: 'Fish patterns generalize the X-Wing concept: N rows (or columns) contain a digit in exactly N columns (or rows), allowing eliminations.',
			techniques: [
				{ name: 'X-Wing', se: '3.2', tier: 'Intermediate', tierClass: 'tier-intermediate' },
				{ name: 'Finned X-Wing', se: '3.4', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Swordfish', se: '3.8', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Finned Swordfish', se: '4.0', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Jellyfish', se: '5.2', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Finned Jellyfish', se: '5.4', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Siamese Fish', se: '5.5', tier: 'Master', tierClass: 'tier-master', secret: true },
				{ name: 'Franken Fish', se: '5.5', tier: 'Master', tierClass: 'tier-master', secret: true },
				{ name: 'Mutant Fish', se: '6.5', tier: 'Extreme', tierClass: 'tier-extreme', secret: true },
				{ name: 'Kraken Fish', se: '8.0', tier: 'Extreme', tierClass: 'tier-extreme', secret: true },
			]
		},
		{
			id: 'wings', label: 'Wings', color: '#a855f7',
			desc: 'Wing patterns exploit bivalue and trivalue cells linked by shared candidates.',
			techniques: [
				{ name: 'XY-Wing', se: '4.2', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'XYZ-Wing', se: '4.4', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'W-Wing', se: '4.4', tier: 'Master', tierClass: 'tier-master', secret: true },
				{ name: 'WXYZ-Wing', se: '4.6', tier: 'Expert', tierClass: 'tier-expert' },
			]
		},
		{
			id: 'chains', label: 'Chains', color: '#4f46e5', secret: true,
			desc: 'Chain techniques build alternating inference chains through strong and weak links.',
			techniques: [
				{ name: 'X-Chain', se: '4.5', tier: 'Master', tierClass: 'tier-master' },
				{ name: '3D Medusa', se: '5.0', tier: 'Master', tierClass: 'tier-master' },
				{ name: 'AIC', se: '6.0', tier: 'Master', tierClass: 'tier-master' },
			]
		},
		{
			id: 'rectangles', label: 'Rectangles', color: '#f97316',
			desc: 'Uniqueness-based techniques that exploit the constraint that a valid Sudoku must have a single solution.',
			techniques: [
				{ name: 'Empty Rectangle', se: '4.6', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Avoidable Rectangle', se: '4.6', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Unique Rectangle', se: '4.6', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Hidden Rectangle', se: '4.7', tier: 'Expert', tierClass: 'tier-expert' },
				{ name: 'Extended Unique Rectangle', se: '5.5', tier: 'Master', tierClass: 'tier-master', secret: true },
			]
		},
		{
			id: 'als', label: 'ALS', color: '#db2777', secret: true,
			desc: 'Almost Locked Sets (ALS) are groups of N cells containing N+1 candidates.',
			techniques: [
				{ name: 'ALS-XZ', se: '5.5', tier: 'Master', tierClass: 'tier-master' },
				{ name: 'ALS-XY-Wing', se: '7.0', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'ALS Chain', se: '7.5', tier: 'Extreme', tierClass: 'tier-extreme' },
			]
		},
		{
			id: 'forcing', label: 'Forcing', color: '#e11d48', secret: true,
			desc: 'Forcing chain techniques test all candidates of a cell or region. The most powerful logical techniques before brute force.',
			techniques: [
				{ name: 'Nishio Forcing Chain', se: '7.5', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Cell Forcing Chain', se: '8.3', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Region Forcing Chain', se: '8.5', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Dynamic Forcing Chain', se: '9.3', tier: 'Extreme', tierClass: 'tier-extreme' },
			]
		},
		{
			id: 'other', label: 'Other', color: '#64748b', secret: true,
			desc: 'Specialized techniques that don\'t fit neatly into the families above.',
			techniques: [
				{ name: 'Sue de Coq', se: '5.0', tier: 'Master', tierClass: 'tier-master' },
				{ name: 'Aligned Pair Exclusion', se: '6.2', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Aligned Triplet Exclusion', se: '7.5', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Death Blossom', se: '8.5', tier: 'Extreme', tierClass: 'tier-extreme' },
				{ name: 'Arithmetic Counting', se: '8.5 (uncalibrated)', tier: 'Extreme', tierClass: 'tier-extreme', desc: 'Combines Sudoku counting rules to eliminate a candidate when its assumption requires an impossible total or remainder.' },
				{ name: 'BUG+1', se: '5.6', tier: 'Master', tierClass: 'tier-master' },
				{ name: 'Backtracking', se: '11.0', tier: 'Extreme', tierClass: 'tier-extreme' },
			]
		},
	];

	const totalTechniqueCount = families.reduce((count, family) => count + family.techniques.length, 0);
	let techniqueCount = $derived(families
		.filter((family) => !family.secret || playerStore.secrets)
		.reduce((count, family) => count + family.techniques.filter((technique) => !technique.secret || playerStore.secrets).length, 0));
</script>

<SeoHead
	title="Sudoku Solving Techniques — Ukodus"
	description={`All ${totalTechniqueCount} Sudoku techniques in the Ukodus engine catalog, including Arithmetic Counting. SE-inspired scores and difficulty tiers.`}
	url="https://ukodus.now/techniques/"
/>

<main id="main-content" tabindex="-1" class="wrap">
	<section class="page-intro">
		<p class="kicker">A field guide to Sudoku</p>
		<h1>Solving Techniques</h1>
		<p>
			Explore {techniqueCount} techniques from the Ukodus engine catalog, organized by family.
			Scores use an engine scale inspired by Sudoku Explainer (SE). Arithmetic Counting's
			8.5 score is an uncalibrated estimate; it does not establish human solving difficulty.
		</p>
	</section>

	<nav class="section-nav" aria-label="Technique families">
		{#each families as family}{#if !family.secret || playerStore.secrets}<a href={`#${family.id}`}>{family.label} ↓</a>{/if}{/each}
	</nav>

	{#each families as family}
		{#if !family.secret || playerStore.secrets}
			<section class="section" id={family.id}>
				<div class="family-header">
					<div class="family-dot" style="background: {family.color}"></div>
					<h2>{family.label}</h2>
				</div>
				<p class="family-desc">{family.desc}</p>
				<p class="table-hint">Scroll the table sideways to see every column →</p>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need keyboard focus.) -->
				<div class="technique-table-wrap" tabindex="0" role="region" aria-label="Technique ratings">
					<table class="data-table technique-table" style="--family-color: {family.color}">
						<thead>
							<tr><th>Technique</th><th>SE-inspired score</th><th>Tier</th></tr>
						</thead>
						<tbody>
							{#each family.techniques as tech}
								{#if !tech.secret || playerStore.secrets}
									<tr>
										<td>{tech.name}{#if tech.desc}<small>{tech.desc}</small>{/if}</td>
										<td class="se-rating">{tech.se}</td>
										<td><span class="tier-badge {tech.tierClass}">{tech.tier}</span></td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
	{/each}

	<section class="section bottom-cta">
		<h2>Ready to test your technique?</h2>
		<div class="cta">
			<a class="btn primary" href="/play/">
				<span class="dot" aria-hidden="true"></span>
				Play Now
			</a>
		</div>
		<div class="bottom-links">
			<a href="/galaxy/">See techniques in the Galaxy</a>
			<a href="/difficulty/">Learn about difficulty tiers</a>
			<a href="/play/">Start a puzzle</a>
		</div>
	</section>
</main>

<style>
	.family-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
	.family-header h2 { margin: 0; }
	.family-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
	.family-desc { margin-bottom: 24px; }
	.technique-table { min-width: 540px; }
	.technique-table th:first-child, .technique-table td:first-child { border-left: 3px solid var(--family-color); }
	.technique-table small { display: block; margin-top: 8px; color: var(--muted); font-weight: 400; line-height: 1.65; max-width: 50ch; }
	.se-rating { font: 12px var(--mono); font-variant-numeric: tabular-nums; }
	.tier-badge { display: inline-flex; padding: 5px 8px; border: 1px solid var(--border); background: var(--grid); color: var(--ink); border-radius: 5px; font: 10px var(--mono); white-space: nowrap; }
</style>
