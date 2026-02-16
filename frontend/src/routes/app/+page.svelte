<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TabControl from '$lib/components/TabControl.svelte';

	let activeDemo = $state('demo-tui');

	const demoTabs = [
		{ id: 'demo-tui', label: 'TUI' },
		{ id: 'demo-wasm', label: 'WASM' },
	];
</script>

<SeoHead
	title="Ukodus for iOS — Sudoku with teeth"
	description="Ukodus is a Sudoku app built on a shared Rust engine: unique puzzles, human-style difficulty, hints with logical proofs, and zero tracking. iOS + TUI + WASM."
	url="https://ukodus.now/app/"
	jsonLd={{
		'@context': 'https://schema.org',
		'@type': 'MobileApplication',
		name: 'Ukodus — Sudoku',
		operatingSystem: 'iOS',
		applicationCategory: 'GameApplication',
		url: 'https://ukodus.now/app/',
		downloadUrl: 'https://apps.apple.com/us/app/sudoku/id6758485043',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		description: 'A Sudoku app built on a shared Rust engine with 45 solving techniques, human-style difficulty ratings, and hints with logical proofs.'
	}}
/>

<main class="wrap">
	<section class="hero" id="top">
		<div>
			<div class="kicker float-in delay-1">Rust engine &middot; iOS &middot; TUI &middot; WASM</div>
			<h1 class="float-in delay-2">Sudoku with teeth.</h1>
			<p class="subtitle float-in delay-3">
				Ukodus is a Sudoku app built on a shared Rust core: unique puzzles,
				human-style difficulty ratings, hints with logical proofs, and zero
				tracking. No analytics, no ads, no weird "engagement" math.
			</p>

			<div class="chips float-in delay-4">
				<div class="chip"><b>Unique</b> solutions</div>
				<div class="chip"><b>Human</b> difficulty model</div>
				<div class="chip"><b>Local</b> data by default</div>
				<div class="chip"><b>Same</b> engine everywhere</div>
			</div>

			<div class="cta float-in delay-4">
				<a class="btn primary" href="https://apps.apple.com/us/app/sudoku/id6758485043">
					<span class="dot" aria-hidden="true"></span>
					Download on the App Store
				</a>
				<a class="btn" href="#demos">Watch demos</a>
				<a class="btn" href="/play/">Play in browser</a>
			</div>
		</div>

		<div class="phone float-in delay-2" aria-label="Ukodus iOS demo video">
			<div class="notch" aria-hidden="true"></div>
			<video
				src="/assets/demos/ios-demo.mp4"
				poster="/assets/demos/ios-demo-poster.jpg"
				playsinline
				muted
				loop
				autoplay
			>
				Your browser does not support video.
			</video>
		</div>
	</section>

	<section class="section" id="why">
		<h2>Built like a tool, not a trap.</h2>
		<p>Fast, readable, and honest: if a puzzle is ambiguous, the generator throws it away and tries again.</p>
		<div class="grid">
			<div class="card">
				<h3>Local-first</h3>
				<p>No analytics. No trackers. Your progress stays on-device (optional Game Center / iCloud).</p>
			</div>
			<div class="card">
				<h3>Difficulty you can feel</h3>
				<p>The Rust solver simulates human techniques to assign a rating. Generation retries until it matches the requested level.</p>
			</div>
			<div class="card">
				<h3>One engine, many shells</h3>
				<p>The same core powers iOS, a terminal UI, and a WASM build. Same puzzles. Same rules. Same difficulty model.</p>
			</div>
		</div>
	</section>

	<section class="section" id="demos">
		<h2>Demos</h2>
		<p>More builds that share the same generator and solver.</p>

		<TabControl tabs={demoTabs} activeTab={activeDemo} onselect={(id) => activeDemo = id} />

		<div class="demos">
			{#if activeDemo === 'demo-tui'}
				<div class="demo-pane" role="tabpanel">
					<div class="media">
						<img src="/assets/demos/tui.gif" alt="Terminal UI demo of Ukodus Sudoku" />
						<div class="caption">Terminal UI: keyboard-driven, instant feedback, same Rust core.</div>
					</div>
				</div>
			{:else}
				<div class="demo-pane" role="tabpanel">
					<div class="media">
						<img src="/assets/demos/wasm.gif" alt="WebAssembly demo of Ukodus Sudoku" />
						<div class="caption">WASM build: runs the generator and solver in the browser.</div>
					</div>
				</div>
			{/if}
		</div>

		<pre><code>cargo run -p sudoku-tui --bin sudoku

wasm-pack build crates/sudoku-wasm --target web --out-dir crates/sudoku-wasm/www/pkg --release
cd crates/sudoku-wasm/www
python3 serve.py 8080</code></pre>
	</section>

	<section class="section" id="engine">
		<h2>Engine Notes (Rust)</h2>
		<p>
			Puzzle generation starts with a full solution, removes givens while
			preserving uniqueness, then rates the result using a technique-based solver.
			If the rating is wrong, generation retries.
		</p>
		<pre><code>Generate
  1) Create a fully solved grid
  2) Remove givens (often in symmetric pairs)
  3) After each removal: verify exactly one solution exists
  4) Run the human-style solver to rate difficulty
  5) If the rating doesn't match the requested level: retry</code></pre>
		<div class="cta">
			<a class="btn" href="https://github.com/kcirtapfromspace/sudoku-core/blob/main/README.md">Difficulty system</a>
			<a class="btn" href="https://github.com/kcirtapfromspace/sudoku-core/blob/main/src/generator.rs">Generator source</a>
			<a class="btn" href="https://github.com/kcirtapfromspace/sudoku-core/blob/main/src/solver/">Solver source</a>
		</div>
	</section>

	<section class="section" id="bottom-cta">
		<h2>Get Ukodus</h2>
		<div class="cta">
			<a class="btn primary" href="https://apps.apple.com/us/app/sudoku/id6758485043">
				<span class="dot" aria-hidden="true"></span>
				Download on the App Store
			</a>
			<a class="btn" href="/play/">Play in browser</a>
			<a class="btn" href="https://github.com/kcirtapfromspace/sudoku-core">GitHub</a>
		</div>
	</section>
</main>
