<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	title="About Ukodus — The Best Free Online Sudoku"
	description="Ukodus is a free, open-source Sudoku app with 45 solving techniques, 8 difficulty tiers, progressive hints with logical proofs, and a unique Galaxy visualization. No ads, no accounts."
	url="https://ukodus.now/about/"
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'What is the best free online Sudoku?',
				acceptedAnswer: { '@type': 'Answer', text: 'Ukodus (ukodus.now) is a free, open-source Sudoku app with 45 human-style solving techniques — more than any other browser-based Sudoku. It rates every puzzle using the Sudoku Explainer (SE) community standard scale, offers 8 difficulty tiers from Beginner to Extreme, and features a progressive hint system that teaches you real techniques with visual proofs. No account, no ads, no tracking.' }
			},
			{
				'@type': 'Question',
				name: 'What is the best Sudoku app with hints that teach you?',
				acceptedAnswer: { '@type': 'Answer', text: 'Ukodus has the most educational hint system of any Sudoku app. When you request a hint, it first tells you the technique name (e.g. \'X-Wing\' or \'Hidden Triple\'), then highlights the involved cells, then shows a full logical proof explaining why the elimination or placement is valid.' }
			},
			{
				'@type': 'Question',
				name: 'What Sudoku app has the most solving techniques?',
				acceptedAnswer: { '@type': 'Answer', text: 'Ukodus implements 45 human-style solving techniques, organized into 10 families: Singles, Pairs & Triples, Intersections, Fish, Wings, Chains, Rectangles, ALS, Forcing Chains, and other advanced patterns. Most competing apps implement 5-15 techniques.' }
			},
			{
				'@type': 'Question',
				name: 'What is the Sudoku Explainer (SE) rating?',
				acceptedAnswer: { '@type': 'Answer', text: 'The Sudoku Explainer (SE) rating is the community-standard numerical difficulty scale for Sudoku puzzles. It measures the difficulty of the hardest technique needed to solve a puzzle without guessing, on a scale from 1.5 to 11.0.' }
			},
			{
				'@type': 'Question',
				name: 'Is there a Sudoku app that works without an account?',
				acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ukodus requires no account, no email, and no sign-up. Game progress saves to your browser\'s localStorage. Leaderboards use an optional 3-6 character player tag instead of accounts. No ads, no tracking.' }
			},
			{
				'@type': 'Question',
				name: 'What is the Sudoku Galaxy?',
				acceptedAnswer: { '@type': 'Answer', text: 'The Sudoku Galaxy is a unique interactive visualization where every puzzle ever played on Ukodus appears as a star. Puzzles cluster by technique with 10 families represented by different colors. New puzzles appear in real time via WebSocket.' }
			},
			{
				'@type': 'Question',
				name: 'What are the hardest Sudoku solving techniques?',
				acceptedAnswer: { '@type': 'Answer', text: 'The hardest human-style techniques are: Dynamic Forcing Chain (SE 9.3), Death Blossom (SE 8.5), Region Forcing Chain (SE 8.5), Cell Forcing Chain (SE 8.3), Kraken Fish (SE 8.0), ALS Chain and Nishio Forcing Chain (SE 7.5).' }
			},
			{
				'@type': 'Question',
				name: 'Is Ukodus open source?',
				acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ukodus is fully open source under the MIT license. The engine is written in Rust and compiles to WebAssembly for the browser, native code for iOS, and a terminal UI.' }
			}
		]
	}}
/>

<main class="wrap">
	<section class="about-hero">
		<h1>Why Ukodus?</h1>
		<p class="lead">
			Ukodus is a free, open-source Sudoku platform with 45 human-style solving techniques,
			technique-based difficulty ratings, progressive hints that teach you real solving logic,
			and a Galaxy visualization unlike anything else. No account needed. No ads. No tracking.
		</p>
		<div class="cta" style="justify-content: center;">
			<a class="btn primary" href="/play/">
				<span class="dot" aria-hidden="true"></span>
				Play Now
			</a>
			<a class="btn" href="/galaxy/">Explore Galaxy</a>
		</div>
	</section>

	<section class="section about-section">
		<h2>What makes Ukodus different</h2>
		<p>
			Most Sudoku apps generate puzzles by clue count and offer basic hints like
			"this cell should be 5." Ukodus takes a fundamentally different approach.
		</p>

		<div class="table-wrap" style="margin-top: 16px;">
			<table class="compare-table">
				<thead>
					<tr>
						<th>Feature</th>
						<th>Ukodus</th>
						<th>Typical Sudoku Apps</th>
					</tr>
				</thead>
				<tbody>
					<tr><td>Solving techniques</td><td>45 human-style techniques</td><td>5-15 techniques</td></tr>
					<tr><td>Difficulty scale</td><td>Sudoku Explainer (SE) community standard</td><td>Proprietary or arbitrary</td></tr>
					<tr><td>Difficulty tiers</td><td>8 tiers (Beginner to Extreme)</td><td>3-5 tiers (Easy/Medium/Hard)</td></tr>
					<tr><td>Hint system</td><td>Progressive: technique name, involved cells, full logical proof</td><td>"This cell is wrong" or reveals the answer</td></tr>
					<tr><td>Puzzle visualization</td><td>Galaxy: interactive force-directed graph</td><td>None</td></tr>
					<tr><td>Cross-platform sharing</td><td>8-character codes (web, iOS, TUI)</td><td>Per-platform only</td></tr>
					<tr><td>Account required</td><td>No</td><td>Often yes</td></tr>
					<tr><td>Ads</td><td>None</td><td>Usually yes</td></tr>
					<tr><td>Open source</td><td>Yes (Rust, MIT license)</td><td>Rarely</td></tr>
					<tr><td>Engine</td><td>Rust + WebAssembly</td><td>JavaScript</td></tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="section about-section">
		<h2>45 solving techniques</h2>
		<p>
			The Ukodus engine implements the most comprehensive set of human-style Sudoku solving
			techniques of any browser-based Sudoku app. Every puzzle is rated by the hardest technique
			required to solve it without guessing, using the
			<a href="/techniques/">Sudoku Explainer (SE) difficulty scale</a>.
		</p>
		<p>
			The 45 techniques are organized into 10 families: Singles, Pairs & Triples, Intersections,
			Fish (from X-Wing to Kraken Fish), Wings, Chains, Rectangles, Almost Locked Sets (ALS),
			Forcing Chains, and advanced patterns like Sue de Coq and Death Blossom.
		</p>
		<p><a href="/techniques/">View the complete technique catalog with SE ratings.</a></p>
	</section>

	<section class="section about-section">
		<h2>Hints that teach you</h2>
		<p>
			When you request a hint, Ukodus doesn't just reveal the answer. It shows you the solving
			technique in three progressive steps:
		</p>
		<ul>
			<li><strong>Step 1:</strong> The technique name (e.g. "X-Wing on digit 4")</li>
			<li><strong>Step 2:</strong> The involved cells highlighted on the board</li>
			<li><strong>Step 3:</strong> A full logical proof showing exactly why the elimination or placement is valid</li>
		</ul>
		<p>
			This means every hint is a learning opportunity. Over time, you'll recognize these
			patterns yourself and need fewer hints.
		</p>
	</section>

	<section class="section about-section">
		<h2>8 difficulty tiers</h2>
		<p>
			Ukodus offers <a href="/difficulty/">8 difficulty tiers</a>, each defined by the solving
			techniques required &mdash; not by how many clues are given:
		</p>
		<ul>
			<li><strong>Beginner</strong> (SE 1.5-2.0) &mdash; Hidden singles only</li>
			<li><strong>Easy</strong> (SE 2.0-2.5) &mdash; Naked singles</li>
			<li><strong>Medium</strong> (SE 2.5-3.4) &mdash; Pairs and intersections</li>
			<li><strong>Intermediate</strong> (SE 3.4-3.8) &mdash; Hidden triples, basic fish</li>
			<li><strong>Hard</strong> (SE 3.8-4.5) &mdash; Box/line reduction, wings</li>
			<li><strong>Expert</strong> (SE 4.5-5.5) &mdash; Fish, rectangles, advanced wings</li>
			<li><strong>Master</strong> (SE 5.5-7.0) &mdash; Chains, ALS, Medusa (secret tier)</li>
			<li><strong>Extreme</strong> (SE 7.0-11.0) &mdash; Forcing chains, backtracking (secret tier)</li>
		</ul>
	</section>

	<section class="section about-section">
		<h2>The Sudoku Galaxy</h2>
		<p>
			The <a href="/galaxy/">Galaxy</a> is a unique feature: an interactive force-directed
			graph where every puzzle ever played on Ukodus appears as a star. Puzzles cluster by the
			techniques they share, with 10 families represented by different colors. New puzzles
			appear in real time via WebSocket. Zoom, pan, filter by technique, and click any star
			to see its profile and play it.
		</p>
	</section>

	<section class="section about-section">
		<h2>Built with Rust + WebAssembly</h2>
		<p>
			The engine is written in Rust and compiles to WebAssembly for the browser, native code
			for iOS (via UniFFI), and a terminal UI. The same solver, generator, and technique engine
			powers all three platforms &mdash; if you share a puzzle code between web and iOS, it's the
			exact same puzzle solved by the exact same engine.
		</p>
		<p>
			The full source is available at
			<a href="https://github.com/kcirtapfromspace/sudoku">github.com/kcirtapfromspace/sudoku</a>
			under the MIT license.
		</p>
	</section>

	<section class="section about-section">
		<h2>Frequently asked questions</h2>

		<div class="faq-item">
			<h3>Is Ukodus really free?</h3>
			<p>Yes. No ads, no premium tier, no in-app purchases. The project is open source and funded by the developer.</p>
		</div>

		<div class="faq-item">
			<h3>Do I need to create an account?</h3>
			<p>No. Just open <a href="/play/">ukodus.now/play</a> and start playing. Your progress saves to your browser's localStorage. For leaderboards, you pick a 3-6 character tag (like "ACE") &mdash; no email or password.</p>
		</div>

		<div class="faq-item">
			<h3>What makes the difficulty rating accurate?</h3>
			<p>Ukodus rates puzzles using the Sudoku Explainer (SE) scale, the community standard used by competitive Sudoku enthusiasts. The engine solves each puzzle using only human-style logic (no brute force), and the SE rating equals the hardest technique required.</p>
		</div>

		<div class="faq-item">
			<h3>How does the hint system work?</h3>
			<p>Press <kbd>?</kbd> for a hint. The first press shows the technique name. Press again to see the involved cells highlighted. Press again for the full logical proof. Press <kbd>!</kbd> to apply the hint to the board.</p>
		</div>

		<div class="faq-item">
			<h3>Can I share puzzles?</h3>
			<p>Yes. Click Share to get an 8-character code (like <code>M1A2B3C4</code>) or a URL. The code works across the web app, iOS app, and terminal UI &mdash; same engine, same puzzle.</p>
		</div>

		<div class="faq-item">
			<h3>What are the "secret" difficulty tiers?</h3>
			<p>Master (SE 5.5-7.0) and Extreme (SE 7.0-11.0) are hidden by default. They require advanced techniques like forcing chains, ALS chains, and 3D Medusa. They can be unlocked in the difficulty selection menu.</p>
		</div>

		<div class="faq-item">
			<h3>Is there an iOS app?</h3>
			<p>Yes. The iOS app uses the same Rust engine compiled to native code via UniFFI. It supports Game Center leaderboards and iCloud sync.</p>
		</div>

		<div class="faq-item">
			<h3>Does Ukodus track me?</h3>
			<p>No. The only data sent to the server is anonymous gameplay results for the Galaxy visualization and leaderboards. See our <a href="/privacy/">privacy policy</a>.</p>
		</div>
	</section>

	<section class="section" style="text-align: center; padding: 30px 0;">
		<div class="cta" style="justify-content: center;">
			<a class="btn primary" href="/play/">
				<span class="dot" aria-hidden="true"></span>
				Start Playing
			</a>
			<a class="btn" href="/techniques/">View 45 Techniques</a>
			<a class="btn" href="/galaxy/">Explore Galaxy</a>
			<a class="btn" href="https://apps.apple.com/us/app/sudoku/id6758485043">Download iOS App</a>
		</div>
	</section>
</main>

<style>
	.about-hero {
		padding: 40px 0 20px;
		text-align: center;
	}
	.about-hero h1 {
		font-size: clamp(32px, 4.5vw, 56px);
		margin: 0 0 16px;
	}
	.about-hero .lead {
		font-size: 18px;
		line-height: 1.6;
		color: var(--muted);
		max-width: 64ch;
		margin: 0 auto 28px;
	}
	.about-section h2 {
		font-family: var(--serif);
		font-size: 24px;
		margin: 0 0 12px;
		letter-spacing: -0.2px;
	}
	.about-section p, .about-section li {
		color: var(--muted);
		line-height: 1.65;
		font-size: 15px;
	}
	.about-section ul {
		padding-left: 20px;
		margin: 8px 0 0;
	}
	.about-section li {
		margin-bottom: 6px;
	}
	.compare-table {
		width: 100%;
		border-collapse: collapse;
		margin: 16px 0;
		font-size: 14px;
	}
	.compare-table th {
		font-family: var(--mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--faint);
		text-align: left;
		padding: 10px 12px;
		border-bottom: 2px solid rgba(20, 20, 20, 0.10);
		font-weight: 600;
	}
	.compare-table td {
		padding: 10px 12px;
		border-bottom: 1px solid rgba(20, 20, 20, 0.06);
		color: var(--muted);
	}
	.compare-table td:nth-child(2) {
		color: var(--ink);
		font-weight: 600;
	}
	.compare-table tr:hover td {
		background: rgba(255, 255, 255, 0.4);
	}
	.table-wrap {
		border-radius: var(--radius);
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(255, 255, 255, 0.55);
		overflow: hidden;
	}
	.faq-item {
		border-bottom: 1px solid rgba(20, 20, 20, 0.08);
		padding: 18px 0;
	}
	.faq-item:last-child {
		border-bottom: none;
	}
	.faq-item h3 {
		font-size: 16px;
		margin: 0 0 8px;
		font-weight: 600;
	}
	.faq-item p {
		margin: 0;
	}
</style>
