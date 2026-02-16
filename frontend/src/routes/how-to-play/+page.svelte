<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	title="How to Play Sudoku — Ukodus"
	description="Learn how to play Sudoku on Ukodus. Controls, hints, sharing, and strategy."
	url="https://ukodus.now/how-to-play/"
/>

<main class="wrap">
	<section class="section" style="border-top: none; margin-top: 0">
		<h2>How to Play Sudoku</h2>
		<p>
			Fill every row, column, and 3&times;3 box with the digits 1&ndash;9.
			Each digit appears exactly once in each region. Ukodus generates
			puzzles with a guaranteed unique solution, powered by a Rust engine
			running in your browser via WebAssembly.
		</p>
	</section>

	<section class="section" id="getting-started">
		<h2>Getting Started</h2>
		<p>Click <a href="/play/">Play</a> and choose a difficulty tier. Five tiers are available by default:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 4">
				<h3>Beginner</h3>
				<p>Solvable with naked and hidden singles only. A great starting point for new players.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Easy</h3>
				<p>Introduces locked candidates and basic intersections alongside singles.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Medium</h3>
				<p>Requires pairs, triples, and pointing/claiming techniques to solve.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Hard</h3>
				<p>Introduces X-Wings, Swordfish, and other fish patterns alongside quads.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Expert</h3>
				<p>Demands advanced techniques: XY-Wings, Unique Rectangles, and more.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Secret Tiers</h3>
				<p>Master and Extreme tiers are hidden by default. Discover how to unlock them for the hardest puzzles.</p>
			</div>
		</div>
	</section>

	<section class="section" id="controls">
		<h2>Controls</h2>
		<p>Ukodus supports keyboard, mouse, and touch input. Here are the keyboard shortcuts:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 12">
				<table class="controls-table">
					<thead>
						<tr><th>Key</th><th>Action</th></tr>
					</thead>
					<tbody>
						<tr><td><code>Arrow keys</code> / <code>h j k l</code> / <code>w a s d</code></td><td>Navigate the grid</td></tr>
						<tr><td><code>1</code>&ndash;<code>9</code></td><td>Place a digit in the selected cell</td></tr>
						<tr><td><code>0</code> / <code>Delete</code> / <code>Backspace</code></td><td>Clear the selected cell</td></tr>
						<tr><td><code>c</code></td><td>Toggle candidate (notes) mode</td></tr>
						<tr><td><code>n</code></td><td>Start a new game</td></tr>
						<tr><td><code>u</code></td><td>Undo the last move</td></tr>
						<tr><td><code>p</code></td><td>Pause the game timer</td></tr>
						<tr><td><code>f</code></td><td>Full clear &mdash; remove all player entries</td></tr>
						<tr><td><code>x</code></td><td>Remove a digit (in candidate mode)</td></tr>
						<tr><td><code>?</code></td><td>Get a hint</td></tr>
						<tr><td><code>!</code></td><td>Apply the current hint</td></tr>
						<tr><td><code>Enter</code> / <code>Space</code></td><td>Confirm selection</td></tr>
					</tbody>
				</table>
			</div>
		</div>
	</section>

	<section class="section" id="candidate-mode">
		<h2>Candidate Mode</h2>
		<p>
			Press <code>c</code> to toggle candidate mode (also called pencil marks or notes). In this mode, pressing a digit adds or removes it as a small candidate in the selected cell instead of placing it as your answer. Candidates help you track which digits are still possible in each cell&mdash;an essential technique for harder puzzles.
		</p>
		<p>When you place a final digit, conflicting candidates in the same row, column, and box are automatically removed.</p>
	</section>

	<section class="section" id="hints">
		<h2>Hints</h2>
		<p>Ukodus provides progressive hints that teach you solving techniques rather than just giving answers. Press <code>?</code> to request a hint:</p>
		<div class="grid">
			<div class="card" style="grid-column: span 4">
				<h3>Step 1: Technique Name</h3>
				<p>The first press shows which solving technique applies next (e.g., "Naked Pair", "X-Wing"). Try to find it yourself.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Step 2: Involved Cells</h3>
				<p>Press <code>?</code> again to highlight the specific cells and candidates involved in the technique.</p>
			</div>
			<div class="card" style="grid-column: span 4">
				<h3>Step 3: Full Proof</h3>
				<p>A third press reveals the complete explanation: which candidates can be eliminated and why. Press <code>!</code> to apply the hint to the board.</p>
			</div>
		</div>
	</section>

	<section class="section" id="difficulty">
		<h2>Difficulty Tiers</h2>
		<p>
			Each puzzle is rated using the Sudoku Explainer (SE) scale based on the hardest technique required to solve it. Ukodus offers 8 tiers, from Beginner (SE 1.5&ndash;2.5) through Extreme (SE 9.0+), each requiring progressively more advanced solving techniques.
		</p>
		<p>For a detailed breakdown, see the <a href="/difficulty/">Difficulty Tiers</a> page.</p>
	</section>

	<section class="section" id="sharing">
		<h2>Sharing Puzzles</h2>
		<p>
			After finishing a game (or during play), click <strong>Share</strong> to generate an 8-character puzzle code like <code>M1A2B3C4</code>. Share the code with friends, or copy the full URL. The same code works across the web app, iOS app, and terminal UI&mdash;identical engine, identical puzzle.
		</p>
	</section>

	<section class="section" id="leaderboard">
		<h2>Leaderboard</h2>
		<p>
			The leaderboard is fully anonymous. Choose a display tag when you submit your time&mdash;no account or sign-up required. Your best times are ranked against other players for each difficulty tier. Move logs are recorded for anti-cheat verification, ensuring fair competition.
		</p>
	</section>

	<section class="section">
		<div class="cta" style="justify-content: center; margin-top: 10px">
			<a class="btn primary" href="/play/">
				<span class="dot" aria-hidden="true"></span>
				Start Playing
			</a>
			<a class="btn" href="/techniques/">Explore Techniques</a>
		</div>
	</section>
</main>

<style>
	.controls-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	.controls-table th {
		text-align: left;
		padding: 8px 12px;
		font-size: 12px;
		color: rgba(20, 20, 20, 0.46);
		font-weight: 500;
		border-bottom: 1px solid rgba(20, 20, 20, 0.12);
	}
	.controls-table td {
		padding: 8px 12px;
		border-bottom: 1px solid rgba(20, 20, 20, 0.06);
	}
</style>
