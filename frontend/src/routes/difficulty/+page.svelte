<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { playerStore } from '$lib/stores/player.svelte';

	const tiers = [
		{ name: 'Beginner', se: '1.5 – 2.0', color: '#22c55e', techniques: ['Hidden singles'], desc: 'Simple scanning. Each step has an obvious answer. Look for rows, columns, or boxes where only one cell can hold a particular digit.' },
		{ name: 'Easy', se: '2.0 – 2.5', color: '#4ade80', techniques: ['Naked singles'], desc: 'Direct candidates. Look for cells with only one possibility. If you can count to nine, you can solve these.' },
		{ name: 'Medium', se: '2.5 – 3.4', color: '#f59e0b', techniques: ['Pairs', 'Intersections'], desc: 'Candidate interactions. Start thinking about what digits can go where. Pointing pairs and naked pairs appear for the first time.' },
		{ name: 'Intermediate', se: '3.4 – 3.8', color: '#fb923c', techniques: ['Hidden triples', 'X-Wings'], desc: 'Subset logic. Multiple candidates must be considered together. You\'ll start noticing patterns that span rows and columns.' },
		{ name: 'Hard', se: '3.8 – 4.5', color: '#f97316', techniques: ['Box/line reduction', 'Swordfish'], desc: 'Intersection techniques. Constraints between rows, columns, and boxes create eliminations that require careful candidate tracking.' },
		{ name: 'Expert', se: '4.5 – 5.5', color: '#ef4444', techniques: ['Fish', 'Quads', 'Rectangles', 'Wings'], desc: 'Pattern recognition. X-Wings, Unique Rectangles, XY-Wings, and more. These puzzles demand careful notation and spatial awareness.' },
	];

	const secretTiers = [
		{ name: 'Master', se: '5.5 – 7.0', color: '#9333ea', techniques: ['Wings', 'Chains', 'ALS', 'Medusa'], desc: 'Advanced logic chains. Requires deep reasoning across multiple inference steps. This tier is hidden by default and unlocked via a special code in the app.' },
		{ name: 'Extreme', se: '7.0 – 11.0', color: '#e11d48', techniques: ['Forcing chains', 'ALS chains', 'Backtracking'], desc: 'Extreme difficulty. May require trial-and-error reasoning or multi-step forcing chains. This tier is hidden by default and unlocked via a special code in the app.' },
	];

	let tierCount = $derived(playerStore.secrets ? 8 : 6);
</script>

<SeoHead
	title="Sudoku Difficulty Levels — Ukodus"
	description="8 difficulty tiers from Beginner to Extreme. Each puzzle is rated by the techniques required to solve it, using the Sudoku Explainer scale."
	url="https://ukodus.now/difficulty/"
/>

<main class="wrap">
	<section class="page-intro">
		<h1>Difficulty Levels</h1>
		<p>
			Every Ukodus puzzle is rated using two systems: a technique-based
			difficulty tier and a numerical Sudoku Explainer (SE) rating. The SE
			rating measures the hardest technique needed to solve the puzzle
			without guessing.
		</p>
	</section>

	<section class="section" id="tiers">
		<h2>{tierCount} Difficulty Tiers</h2>
		<p>From simple scanning to deep logical chains. Each tier represents a step up in the reasoning required.</p>

		<div class="tier-grid">
			{#each tiers as tier}
				<div class="tier-card" style="--tier-color: {tier.color}">
					<div class="tier-card-name">
						<h3>{tier.name}</h3>
						<span class="se-range">SE {tier.se}</span>
					</div>
					<div class="tier-card-techniques">
						{#each tier.techniques as tech}
							<span class="technique-chip">{tech}</span>
						{/each}
					</div>
					<p class="tier-card-desc">{tier.desc}</p>
				</div>
			{/each}

			{#if playerStore.secrets}
				{#each secretTiers as tier}
					<div class="tier-card" style="--tier-color: {tier.color}">
						<div class="tier-card-name">
							<h3>{tier.name}<span class="secret-badge">Secret</span></h3>
							<span class="se-range">SE {tier.se}</span>
						</div>
						<div class="tier-card-techniques">
							{#each tier.techniques as tech}
								<span class="technique-chip">{tech}</span>
							{/each}
						</div>
						<p class="tier-card-desc">{tier.desc}</p>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<section class="section how-rating" id="how-rating">
		<h2>How Rating Works</h2>
		<p>
			The engine solves each puzzle using only human-style techniques &mdash;
			no brute force. It tries techniques in order from easiest to hardest,
			and the SE rating equals the hardest technique needed to reach the solution.
		</p>
		<p>
			A puzzle that can be solved entirely with hidden singles rates 1.5. A
			puzzle that needs one X-Wing step rates 3.2, even if every other step
			is a simple single. The difficulty is always determined by the peak, not the average.
		</p>
		<p>
			This means puzzles that need forcing chains (SE 7.5+) rate much higher
			than those solvable with naked singles (SE 2.3), even if both have a similar number of clues.
		</p>
	</section>

	<section class="section bottom-cta">
		<h2>Choose your challenge</h2>
		<div class="cta">
			<a class="btn primary" href="/play/">
				<span class="dot" aria-hidden="true"></span>
				Play Now
			</a>
			<a class="btn" href="/techniques/">View All Techniques</a>
		</div>
	</section>
</main>

<style>
	.page-intro { padding: 10px 0 0; }
	.page-intro h1 { font-size: clamp(32px, 4.2vw, 52px); }
	.page-intro p { color: var(--muted); line-height: 1.65; max-width: 68ch; }

	.tier-grid { display: flex; flex-direction: column; gap: 14px; margin-top: 14px; }

	.tier-card {
		border-radius: var(--radius);
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.62);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
		padding: 20px 24px;
		display: grid;
		grid-template-columns: 140px 100px 1fr;
		gap: 16px 24px;
		align-items: start;
		position: relative;
		overflow: hidden;
	}

	.tier-card::before {
		content: "";
		position: absolute;
		left: 0; top: 0; bottom: 0;
		width: 4px;
		background: var(--tier-color);
	}

	.tier-card-name { display: flex; flex-direction: column; gap: 6px; }
	.tier-card-name h3 { margin: 0; font-family: var(--serif); font-size: 20px; letter-spacing: -0.2px; }
	.tier-card-name .se-range { font-family: var(--mono); font-size: 13px; color: var(--faint); font-weight: 600; }

	.tier-card-techniques { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 3px; }

	.technique-chip {
		font-family: var(--mono);
		font-size: 11px;
		padding: 4px 10px;
		border-radius: 999px;
		border: 1px solid rgba(20, 20, 20, 0.08);
		background: rgba(255, 255, 255, 0.70);
		white-space: nowrap;
	}

	.tier-card-desc { font-size: 14px; color: var(--muted); line-height: 1.6; margin: 0; }

	.secret-badge {
		display: inline-block;
		font-family: var(--mono);
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 999px;
		background: rgba(147, 51, 234, 0.10);
		color: #7c3aed;
		font-weight: 600;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		margin-left: 8px;
		vertical-align: middle;
	}

	.how-rating { max-width: 68ch; }
	.how-rating p { color: var(--muted); line-height: 1.65; }

	.bottom-cta { text-align: center; padding: 32px 0 12px; }
	.bottom-cta h2 { font-family: var(--serif); font-size: 24px; margin: 0 0 16px; }
	.bottom-cta .cta { justify-content: center; }

	@media (max-width: 768px) {
		.tier-card { grid-template-columns: 1fr; gap: 10px; padding: 16px 20px; }
		.tier-card-name { flex-direction: row; align-items: baseline; gap: 12px; flex-wrap: wrap; }
	}
</style>
