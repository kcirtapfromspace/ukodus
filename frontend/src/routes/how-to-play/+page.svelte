<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	title="How to Play Sudoku — Ukodus"
	description="Learn how to play Sudoku on Ukodus. Controls, hints, sharing, and strategy."
	url="https://ukodus.now/how-to-play/"
/>

<main id="main-content" tabindex="-1" class="wrap">
	<section class="page-intro">
		<p class="kicker">Your first move starts here</p>
		<h1>How to Play Sudoku</h1>
		<p>
			Fill every row, column, and 3&times;3 box with the digits 1&ndash;9.
			Each digit appears exactly once in each region. Ukodus generates
			puzzles with a guaranteed unique solution, powered by a Rust engine
			running in your browser via WebAssembly.
		</p>
	</section>

	<nav class="section-nav" aria-label="Playing guide sections"><a href="#getting-started">Getting started ↓</a><a href="#controls">Controls ↓</a><a href="#hints">Hints ↓</a><a href="#sharing">Sharing ↓</a></nav>
	<section class="section" id="getting-started">
		<h2>Getting Started</h2>
		<p>Click <a href="/play/">Play</a> and choose a difficulty tier. Six tiers are available by default:</p>
		<div class="grid">
			<div class="card">
				<h3>Beginner</h3>
				<p>Solvable with naked and hidden singles only. A great starting point for new players.</p>
			</div>
			<div class="card">
				<h3>Easy</h3>
				<p>Introduces locked candidates and basic intersections alongside singles.</p>
			</div>
			<div class="card">
				<h3>Medium</h3>
				<p>Requires pairs, triples, and pointing/claiming techniques to solve.</p>
			</div>
			<div class="card"><h3>Intermediate</h3><p>Work through pairs and triples by considering candidates together.</p></div>
			<div class="card">
				<h3>Hard</h3>
				<p>Introduces X-Wings, Swordfish, and other fish patterns alongside quads.</p>
			</div>
			<div class="card">
				<h3>Expert</h3>
				<p>Demands advanced techniques: XY-Wings, Unique Rectangles, and more.</p>
			</div>
			<div class="card">
				<h3>Secret Tiers</h3>
				<p>Master and Extreme tiers are hidden by default. Discover how to unlock them for the hardest puzzles.</p>
			</div>
		</div>
	</section>

	<section class="section" id="controls">
		<h2>Controls</h2>
		<p>The browser game uses a keyboard. For touch controls, play on the iOS app. Here are the browser shortcuts:</p>
		<div class="grid">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable tables need keyboard focus.) -->
			<div class="table-wrap wide" tabindex="0" role="region" aria-label="Keyboard controls">
				<table class="data-table controls-table">
					<thead>
						<tr><th>Key</th><th>Action</th></tr>
					</thead>
					<tbody>
						<tr><td><code>Arrow keys</code> / <code>h j k l</code></td><td>Navigate the grid</td></tr>
						<tr><td><code>w a s d</code></td><td>Jump between boxes</td></tr>
						<tr><td><code>1</code>&ndash;<code>9</code></td><td>Place a digit in the selected cell</td></tr>
						<tr><td><code>0</code> / <code>Delete</code> / <code>Backspace</code></td><td>Clear the selected cell</td></tr>
						<tr><td><code>c</code></td><td>Toggle candidate (notes) mode</td></tr>
						<tr><td><code>n</code></td><td>Start a new game</td></tr>
						<tr><td><code>u</code></td><td>Undo the last move</td></tr>
						<tr><td><code>p</code></td><td>Pause the game timer</td></tr>
						<tr><td><code>f</code> / <code>Shift + F</code></td><td>Fill candidates in this cell / every cell</td></tr>
						<tr><td><code>x</code> / <code>Shift + X</code></td><td>Clear candidates in this cell / every cell</td></tr>
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
			<div class="card">
				<h3>Step 1: Technique Name</h3>
				<p>The first press shows which solving technique applies next (e.g., "Naked Pair", "X-Wing"). Try to find it yourself.</p>
			</div>
			<div class="card">
				<h3>Step 2: Full Explanation</h3>
				<p>Press <code>?</code> again to reveal the detailed explanation of the technique and its deductions.</p>
			</div>
			<div class="card">
				<h3>Put It Into Practice</h3>
				<p>Once you understand the next move, press <code>!</code> to apply the hint to the board.</p>
			</div>
		</div>
	</section>

	<section class="section" id="difficulty">
		<h2>Difficulty Tiers</h2>
		<p>
			Each puzzle has an SE-inspired engine score based on the hardest technique used by the solver. Ukodus offers 8 tiers, from Beginner through Extreme. Arithmetic Counting's 8.5 score is an uncalibrated estimate; the difficulty guide explains the scale.
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

<style>.controls-table { min-width: 420px; }</style>
