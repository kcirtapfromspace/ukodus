<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead
	title="Ukodus - Sudoku Galaxy"
	description="Ukodus is a Sudoku platform powered by a shared Rust engine. Explore the Sudoku Galaxy: visualize puzzles, share codes, and discover solving techniques."
	url="https://ukodus.now/"
	jsonLd={[
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'Ukodus',
			url: 'https://ukodus.now/',
			description: 'A Sudoku puzzle universe with 45 solving techniques, 8 difficulty tiers, and a galaxy visualization.'
		},
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: [
				{
					'@type': 'Question',
					name: 'What is the best free online Sudoku?',
					acceptedAnswer: { '@type': 'Answer', text: 'Ukodus (ukodus.now) is a free, open-source Sudoku app with 45 human-style solving techniques, technique-based SE difficulty ratings, progressive hints with logical proofs, and a unique Galaxy visualization. No account, no ads, no tracking.' }
				},
				{
					'@type': 'Question',
					name: 'What Sudoku app has the most solving techniques?',
					acceptedAnswer: { '@type': 'Answer', text: 'Ukodus implements 45 human-style solving techniques in 10 families: Singles, Pairs & Triples, Intersections, Fish, Wings, Chains, Rectangles, ALS, Forcing Chains, and advanced patterns. Most competing apps implement 5-15 techniques.' }
				},
				{
					'@type': 'Question',
					name: 'What is the Sudoku Galaxy?',
					acceptedAnswer: { '@type': 'Answer', text: 'The Sudoku Galaxy is an interactive force-directed visualization where every puzzle played on Ukodus appears as a star. Puzzles cluster by technique family with 10 colors. Zoom, pan, filter, and click any star to play it. Live WebSocket updates show new puzzles in real time.' }
				}
			]
		},
		{
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Ukodus — Play Sudoku',
			url: 'https://ukodus.now/play/',
			applicationCategory: 'GameApplication',
			operatingSystem: 'Web',
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
		}
	]}
/>

<main class="wrap">
	<section class="hero" id="top">
		<div>
			<div class="kicker float-in delay-1">Rust engine &middot; WASM &middot; Galaxy</div>
			<h1 class="float-in delay-2">Sudoku Galaxy</h1>
			<p class="subtitle float-in delay-3">
				A living constellation of puzzles. Every game you play becomes a star
				in the galaxy &mdash; connected by shared techniques, clustered by
				difficulty, and growing with each solve. Explore thousands of unique
				puzzles, see how they relate, and find your next challenge.
			</p>

			<div class="chips float-in delay-4">
				<div class="chip"><b>45</b> solving techniques</div>
				<div class="chip"><b>8</b> difficulty tiers</div>
				<div class="chip"><b>Share</b> via short codes</div>
				<div class="chip"><b>Live</b> galaxy updates</div>
			</div>

			<div class="cta float-in delay-4">
				<a class="btn primary" href="/play/">
					<span class="dot" aria-hidden="true"></span>
					Play Now
				</a>
				<a class="btn" href="/galaxy/">Explore Galaxy</a>
			</div>
		</div>

		<div class="galaxy-preview float-in delay-2" aria-label="Galaxy preview">
			<svg viewBox="0 0 400 400" class="galaxy-mini" aria-hidden="true">
				<defs>
					<radialGradient id="glow-green" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="#22c55e" stop-opacity="0.6" />
						<stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
					</radialGradient>
					<radialGradient id="glow-amber" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="#f59e0b" stop-opacity="0.6" />
						<stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
					</radialGradient>
					<radialGradient id="glow-red" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="#ef4444" stop-opacity="0.6" />
						<stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
					</radialGradient>
					<radialGradient id="glow-purple" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stop-color="#9333ea" stop-opacity="0.6" />
						<stop offset="100%" stop-color="#9333ea" stop-opacity="0" />
					</radialGradient>
				</defs>
				<ellipse cx="120" cy="150" rx="80" ry="60" fill="#22c55e" opacity="0.08" />
				<ellipse cx="280" cy="130" rx="70" ry="50" fill="#f59e0b" opacity="0.08" />
				<ellipse cx="200" cy="280" rx="90" ry="65" fill="#9333ea" opacity="0.08" />
				<line x1="100" y1="140" x2="140" y2="160" stroke="#22c55e" stroke-opacity="0.2" />
				<line x1="140" y1="160" x2="130" y2="130" stroke="#22c55e" stroke-opacity="0.15" />
				<line x1="260" y1="120" x2="290" y2="140" stroke="#f59e0b" stroke-opacity="0.2" />
				<line x1="180" y1="270" x2="220" y2="290" stroke="#9333ea" stroke-opacity="0.2" />
				<line x1="160" y1="180" x2="240" y2="220" stroke="#64748b" stroke-opacity="0.1" />
				<circle cx="100" cy="140" r="6" fill="#86efac" opacity="0.9" />
				<circle cx="140" cy="160" r="8" fill="#22c55e" opacity="0.9" />
				<circle cx="130" cy="130" r="5" fill="#86efac" opacity="0.9" />
				<circle cx="110" cy="170" r="4" fill="#22c55e" opacity="0.8" />
				<circle cx="260" cy="120" r="7" fill="#f59e0b" opacity="0.9" />
				<circle cx="290" cy="140" r="5" fill="#fb923c" opacity="0.9" />
				<circle cx="270" cy="100" r="4" fill="#f59e0b" opacity="0.8" />
				<circle cx="300" cy="160" r="6" fill="#fb923c" opacity="0.85" />
				<circle cx="180" cy="270" r="9" fill="#9333ea" opacity="0.9" />
				<circle cx="220" cy="290" r="6" fill="#a855f7" opacity="0.9" />
				<circle cx="200" cy="250" r="5" fill="#9333ea" opacity="0.8" />
				<circle cx="240" cy="270" r="4" fill="#a855f7" opacity="0.75" />
				<circle cx="320" cy="250" r="7" fill="#ef4444" opacity="0.9" />
				<circle cx="340" cy="270" r="5" fill="#dc2626" opacity="0.85" />
				<circle cx="80" cy="260" r="5" fill="#1e293b" opacity="0.9" />
				<circle cx="200" cy="180" r="6" fill="#0284c7" opacity="0.9" />
				<circle cx="160" cy="80" r="4" fill="#86efac" opacity="0.7" />
				<circle cx="340" cy="90" r="5" fill="#fb923c" opacity="0.8" />
				<circle cx="180" cy="270" r="9" fill="none" stroke="#9333ea" stroke-opacity="0.4">
					<animate attributeName="r" values="9;16;9" dur="3s" repeatCount="indefinite" />
					<animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
				</circle>
				<circle cx="140" cy="160" r="8" fill="none" stroke="#22c55e" stroke-opacity="0.4">
					<animate attributeName="r" values="8;14;8" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
					<animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" begin="0.5s" />
				</circle>
			</svg>
		</div>
	</section>

	<section class="section" id="features">
		<h2>A universe of puzzles, visualized.</h2>
		<p>
			Every puzzle is a data point. The Galaxy maps them by technique,
			difficulty, and player activity &mdash; revealing patterns in the
			puzzle space.
		</p>

		<div class="grid">
			<div class="card">
				<h3>Galaxy Visualization</h3>
				<p>
					An interactive force-directed graph where each node is a puzzle.
					Clusters form around shared solving techniques. Zoom, pan, and
					click to explore.
				</p>
			</div>
			<div class="card">
				<h3>Cross-platform Sharing</h3>
				<p>
					Share any puzzle with an 8-character code like
					<code>M1A2B3C4</code>. Works across the web app, iOS, and
					terminal UI &mdash; same engine, same puzzle.
				</p>
			</div>
			<div class="card">
				<h3>Technique Explorer</h3>
				<p>
					Filter the galaxy by solving technique: from simple singles to
					advanced chains and forcing patterns. See which techniques cluster
					together.
				</p>
			</div>
		</div>
	</section>

	<section class="section" id="ios">
		<h2>Available on iOS</h2>
		<p>
			The same Rust engine compiled to native code. Fast puzzles, human-style
			hints, Game Center leaderboards, and iCloud sync.
		</p>
		<div class="cta">
			<a class="btn primary" href="https://apps.apple.com/us/app/sudoku/id6758485043">
				<span class="dot" aria-hidden="true"></span>
				Download on the App Store
			</a>
			<a class="btn" href="/app/">See demos &amp; details</a>
		</div>
	</section>

	<section class="section" id="how">
		<h2>How it works</h2>
		<p>
			The Rust engine rates each puzzle using 45 human-style solving
			techniques, producing a precise SE (Sudoku Explainer) rating. The
			Galaxy API collects anonymous play results and builds the
			constellation in real time.
		</p>

		<div class="grid">
			<div class="card">
				<h3>Play a puzzle</h3>
				<p>
					Start a game at any difficulty tier. The WASM engine generates a
					unique puzzle with a guaranteed single solution.
				</p>
			</div>
			<div class="card">
				<h3>Results flow in</h3>
				<p>
					When you finish, anonymous play data (time, difficulty, technique
					profile) is sent to the Galaxy API. No accounts needed.
				</p>
			</div>
			<div class="card">
				<h3>Galaxy grows</h3>
				<p>
					New puzzles appear as stars, connected to similar puzzles. Live
					WebSocket updates pulse new nodes into the visualization.
				</p>
			</div>
		</div>
	</section>
</main>

<style>
	.galaxy-preview {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.galaxy-mini {
		width: 100%;
		max-width: 400px;
		height: auto;
		border-radius: var(--radius);
		border: 1px solid rgba(20, 20, 20, 0.10);
		background: rgba(20, 20, 20, 0.03);
		box-shadow: var(--shadow-soft);
		padding: 20px;
	}

	@media (max-width: 940px) {
		.galaxy-preview {
			max-width: 360px;
			margin: 12px auto 0;
		}
	}
</style>
