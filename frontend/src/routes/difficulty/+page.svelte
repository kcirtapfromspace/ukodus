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
	description="8 difficulty tiers from Beginner to Extreme. Puzzle scores reflect techniques used by the solver on an SE-inspired engine scale."
	url="https://ukodus.now/difficulty/"
/>

<main id="main-content" tabindex="-1" class="wrap">
	<section class="page-intro">
		<p class="kicker">Find your next challenge</p>
		<h1>Difficulty Levels</h1>
		<p>
			Every Ukodus puzzle is rated using two systems: a technique-based
			difficulty tier and a numerical engine score inspired by Sudoku Explainer (SE).
			The score reflects the hardest technique used by the solver. Arithmetic Counting's
			8.5 score is an uncalibrated estimate of difficulty.
		</p>
	</section>

	<nav class="section-nav" aria-label="Difficulty guide sections"><a href="#tiers">Difficulty tiers ↓</a><a href="#how-rating">How ratings work ↓</a><a href="/techniques/">Technique catalog ↗</a></nav>
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
			The engine tries logical techniques in a fixed order, with backtracking as a fallback.
			Its score reflects the hardest technique used along that solving path. These engine
			scores have not been verified to match Sudoku Explainer ratings.
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
	.tier-grid { display: grid; gap: 12px; margin-top: 28px; }
	.tier-card { display: grid; grid-template-columns: 150px 160px minmax(0, 1fr); gap: 24px; padding: 28px; background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--tier-color); border-radius: 12px; }
	.tier-card-name { display: flex; flex-direction: column; gap: 10px; }
	.tier-card-name h3 { margin: 0; font: 500 24px var(--serif); letter-spacing: -0.03em; }
	.se-range { font: 11px var(--mono); color: var(--muted); }
	.tier-card-techniques { display: flex; flex-wrap: wrap; align-content: start; gap: 6px; }
	.technique-chip { padding: 5px 8px; border-radius: 5px; background: var(--grid); color: var(--muted); font-size: 11px; }
	.tier-card-desc { margin: 0; font-size: 14px; line-height: 1.8; color: var(--muted); }
	.secret-badge { display: inline-block; margin-left: 8px; color: var(--accent); font: 10px var(--mono); }
	@media (max-width: 760px) { .tier-card { grid-template-columns: 1fr; gap: 16px; padding: 24px; } .tier-card-name { flex-direction: row; align-items: baseline; flex-wrap: wrap; gap: 8px 16px; } }
</style>
