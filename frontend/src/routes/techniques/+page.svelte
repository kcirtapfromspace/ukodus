<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { playerStore } from '$lib/stores/player.svelte';

	interface Technique { name: string; se: string; tier: string; tierClass: string; secret?: boolean; }
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
				{ name: 'BUG+1', se: '5.6', tier: 'Master', tierClass: 'tier-master' },
				{ name: 'Backtracking', se: '11.0', tier: 'Extreme', tierClass: 'tier-extreme' },
			]
		},
	];

	let techniqueCount = $derived(playerStore.secrets ? 45 : 22);
</script>

<SeoHead
	title="Sudoku Solving Techniques — Ukodus"
	description="All 45 Sudoku solving techniques used by the Ukodus engine, from Hidden Singles to Dynamic Forcing Chains. SE ratings and difficulty tiers."
	url="https://ukodus.now/techniques/"
/>

<main class="wrap">
	<section class="page-intro">
		<h1>Solving Techniques</h1>
		<p>
			The Ukodus engine uses {techniqueCount} human-style solving techniques to rate and
			solve every puzzle. Each technique has a Sudoku Explainer (SE) difficulty rating. Here's the full catalog, organized by family.
		</p>
	</section>

	{#each families as family}
		{#if !family.secret || playerStore.secrets}
			<section class="section" id={family.id}>
				<div class="family-header">
					<div class="family-dot" style="background: {family.color}"></div>
					<h2>{family.label}</h2>
				</div>
				<p class="family-desc">{family.desc}</p>
				<div class="technique-table-wrap">
					<table class="technique-table" style="--family-color: {family.color}">
						<thead>
							<tr><th>Technique</th><th>SE Rating</th><th>Tier</th></tr>
						</thead>
						<tbody>
							{#each family.techniques as tech}
								{#if !tech.secret || playerStore.secrets}
									<tr>
										<td>{tech.name}</td>
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
	.page-intro { padding: 10px 0 0; }
	.page-intro h1 { font-size: clamp(32px, 4.2vw, 52px); }
	.page-intro p { color: var(--muted); line-height: 1.65; max-width: 68ch; }

	.family-header { display: flex; align-items: center; gap: 12px; margin: 0 0 6px; }
	.family-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06); }
	.family-desc { color: var(--muted); line-height: 1.6; margin: 0 0 14px; font-size: 14px; }

	.technique-table-wrap {
		border-radius: var(--radius-sm, 8px);
		border: 1px solid rgba(20, 20, 20, 0.08);
		background: rgba(255, 255, 255, 0.62);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}

	.technique-table { width: 100%; border-collapse: collapse; font-size: 14px; }

	.technique-table thead th {
		text-align: left; padding: 12px 16px;
		font-size: 12px; font-family: var(--mono);
		letter-spacing: 0.5px; text-transform: uppercase;
		color: var(--faint); border-bottom: 1px solid rgba(20, 20, 20, 0.08);
	}
	.technique-table thead th:first-child { border-left: 3px solid var(--family-color, var(--ink)); }

	.technique-table tbody td { padding: 10px 16px; border-bottom: 1px solid rgba(20, 20, 20, 0.04); }
	.technique-table tbody tr:last-child td { border-bottom: none; }
	.technique-table tbody tr:hover { background: rgba(20, 20, 20, 0.02); }
	.technique-table tbody td:first-child { border-left: 3px solid var(--family-color, var(--ink)); font-weight: 500; }

	.se-rating { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink); }

	.tier-badge {
		display: inline-block; font-family: var(--mono); font-size: 11px;
		padding: 3px 9px; border-radius: 999px; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap;
	}
	.tier-beginner { background: rgba(34, 197, 94, 0.12); color: #15803d; }
	.tier-easy { background: rgba(34, 197, 94, 0.10); color: #16a34a; }
	.tier-medium { background: rgba(245, 158, 11, 0.12); color: #b45309; }
	.tier-intermediate { background: rgba(245, 158, 11, 0.10); color: #d97706; }
	.tier-hard { background: rgba(249, 115, 22, 0.12); color: #c2410c; }
	.tier-expert { background: rgba(239, 68, 68, 0.10); color: #dc2626; }
	.tier-master { background: rgba(147, 51, 234, 0.12); color: #7c3aed; }
	.tier-extreme { background: rgba(225, 29, 72, 0.12); color: #be123c; }

	.bottom-cta { text-align: center; padding: 32px 0 12px; }
	.bottom-cta h2 { font-family: var(--serif); font-size: 24px; margin: 0 0 16px; }
	.bottom-cta .cta { justify-content: center; }
	.bottom-links { margin-top: 24px; display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; font-size: 14px; color: var(--muted); }
	.bottom-links a { text-decoration: underline; text-underline-offset: 3px; }

	@media (max-width: 640px) {
		.technique-table thead th, .technique-table tbody td { padding: 8px 12px; }
		.technique-table { font-size: 13px; }
	}
</style>
