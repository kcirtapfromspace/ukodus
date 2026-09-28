<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import TabControl from '$lib/components/TabControl.svelte';
	import IPhoneDemo from '$lib/components/IPhoneDemo.svelte';

	let activeDemo = $state('demo-tui');
	const demoTabs = [
		{ id: 'demo-tui', label: 'TUI' },
		{ id: 'demo-wasm', label: 'WASM' }
	];
	const features = [
		{ number: '01', title: 'A reason behind every hint.', text: 'Follow the logic, one step at a time. Hints explain the solving technique, so you learn something with every puzzle.' },
		{ number: '02', title: 'A challenge that fits.', text: 'Difficulty is measured by the techniques a puzzle takes to solve. Find your rhythm, then work your way up.' },
		{ number: '03', title: 'Space to concentrate.', text: 'No ads or tracking in the iOS app. Your progress stays on your device, with optional Game Center and iCloud.' }
	];
</script>

<SeoHead
	title="Ukodus for iOS — Sudoku with teeth"
	description="Thoughtful Sudoku for iPhone. Unique puzzles, human-style difficulty, and hints that explain the logic. Free on the App Store."
	url="https://ukodus.now/app/"
	jsonLd={{
		'@context': 'https://schema.org', '@type': 'MobileApplication',
		name: 'Ukodus — Sudoku', operatingSystem: 'iOS', applicationCategory: 'GameApplication',
		url: 'https://ukodus.now/app/', downloadUrl: 'https://apps.apple.com/us/app/sudoku/id6758485043',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		description: 'A Sudoku app built on a shared Rust engine with 46 solving techniques, human-style difficulty ratings, and hints with logical proofs.'
	}}
/>

{#snippet downloadLink()}
	<a class="store-link" href="https://apps.apple.com/us/app/sudoku/id6758485043" aria-label="Download on the App Store">
		<svg width="22" height="26" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3v15m-5-5 5 5 5-5M4 20v4h16v-4" /></svg>
		<span><small>Download on the</small><strong>App Store</strong></span>
		<span class="store-arrow" aria-hidden="true">↗</span>
	</a>
{/snippet}

<main id="main-content" tabindex="-1" class="wrap app-page">
	<section class="app-hero" id="top" aria-labelledby="app-title">
		<div class="hero-copy float-in">
			<p class="eyebrow"><span class="availability" aria-hidden="true"></span> A little focus, wherever you go.</p>
			<h1 id="app-title">Sudoku <br /><span>with teeth.</span></h1>
			<p class="hero-description">Beautifully simple. Satisfyingly difficult. A Sudoku app for the quiet pleasure of figuring it out.</p>
			<div class="hero-actions">
				{@render downloadLink()}
				<a class="text-link" href="/play/">Play in browser <span aria-hidden="true">↗</span></a>
			</div>
			<p class="download-note">Free for iPhone. Just you and the next move.</p>
			<div class="hero-footnote"><span class="mini-grid" aria-hidden="true"></span><p>One solution. Every puzzle.<br /><span>Hints that show you why.</span></p></div>
		</div>
		<div class="phone-stage float-in delay-2">
			<div class="phone-halo" aria-hidden="true"></div>
			<IPhoneDemo />
		</div>
	</section>

	<div class="product-strip" aria-label="App highlights">
		<span>Made for thoughtful play</span>
		<p>Logical hints <i aria-hidden="true">/</i> Human-rated difficulty <i aria-hidden="true">/</i> No ads in the iOS app</p>
		<a href="#why" aria-label="Discover the app features">Explore <span aria-hidden="true">↓</span></a>
	</div>

	<section class="app-section features" id="why" aria-labelledby="features-title">
		<div class="section-intro">
			<p class="eyebrow">The joy is in the solving</p>
			<h2 id="features-title">Less distraction.<br /><em>More discovery.</em></h2>
			<p>From the first obvious number to the last unexpected connection, every detail gives you room to think.</p>
			<a class="text-link" href="/techniques/">Meet the solving techniques <span aria-hidden="true">↗</span></a>
		</div>
		<div class="feature-list">
			{#each features as feature}
				<article class="feature">
					<span class="feature-number">{feature.number}</span>
					<div><h3>{feature.title}</h3><p>{feature.text}</p></div>
				</article>
			{/each}
		</div>
	</section>

	<section class="app-section demo-section" id="demos" aria-labelledby="demos-title">
		<div class="section-heading">
			<div><p class="eyebrow">The same logic, everywhere</p><h2 id="demos-title">Find your way to play.</h2></div>
			<p>On your phone, in your browser, or at the terminal. One shared engine keeps every puzzle honest.</p>
		</div>
		<div class="demo-shell">
			<div class="demo-toolbar"><span class="demo-label">Engine in action</span><TabControl tabs={demoTabs} activeTab={activeDemo} onselect={(id) => activeDemo = id} /></div>
			{#each demoTabs as demo}
			<div class="demo-panel" id={demo.id} role="tabpanel" aria-labelledby={`${demo.id}-tab`} tabindex="0" hidden={activeDemo !== demo.id}>
				{#if demo.id === 'demo-tui'}
					<img src="/assets/demos/tui.gif" alt="Terminal UI demo of Ukodus Sudoku" width="856" height="686" loading="lazy" />
					<p class="demo-caption"><strong>Terminal UI</strong><span>Keyboard-driven. Instant feedback. The same Rust core.</span></p>
				{:else}
					<img src="/assets/demos/wasm.gif" alt="WebAssembly demo of Ukodus Sudoku" width="900" height="671" loading="lazy" />
					<p class="demo-caption"><strong>WASM</strong><span>The generator and solver, running right in your browser.</span></p>
				{/if}
			</div>
			{/each}
		</div>
	</section>

	<section class="app-section engine-section" id="engine" aria-labelledby="engine-title">
		<div class="section-intro"><p class="eyebrow">Open source. Open to inspection.</p><h2 id="engine-title">Good puzzles.<br /><em>Solid foundations.</em></h2></div>
		<div class="engine-copy">
			<p>Every puzzle begins with a complete grid. The engine removes numbers, checks that exactly one solution remains, and rates the result using human solving techniques.</p>
			<p>If the difficulty doesn’t fit, it tries again. That care is built into the code.</p>
			<div class="source-links"><a class="text-link" href="/difficulty/">How difficulty works <span aria-hidden="true">↗</span></a><a class="text-link" href="https://github.com/kcirtapfromspace/sudoku-core">Explore the source <span aria-hidden="true">↗</span></a></div>
			<details class="developer-details"><summary>Build it yourself</summary>
				<p>Run these commands from the <a href="https://github.com/kcirtapfromspace/sudoku-core">sudoku-core repository</a>.</p>
				<pre><code>cargo run -p sudoku-tui --bin sudoku

wasm-pack build crates/sudoku-wasm --target web --out-dir crates/sudoku-wasm/www/pkg --release
cd crates/sudoku-wasm/www
python3 serve.py 8080</code></pre>
				<div class="source-links"><a href="https://github.com/kcirtapfromspace/sudoku-core/blob/main/src/generator.rs">Generator source ↗</a><a href="https://github.com/kcirtapfromspace/sudoku-core/blob/main/src/solver/">Solver source ↗</a></div>
			</details>
		</div>
	</section>

	<section class="closing-section" aria-labelledby="closing-title">
		<img src="/assets/app-icon.png" alt="" width="56" height="56" loading="lazy" />
		<p class="eyebrow">Your next small obsession</p>
		<h2 id="closing-title">Make room for<br /><em>one more puzzle.</em></h2>
		<div class="hero-actions">{@render downloadLink()}<a class="text-link" href="/play/">Play in browser <span aria-hidden="true">↗</span></a></div>
	</section>
</main>

<style>
	.app-page { --app-accent: #a64d29; padding-top: 0; padding-bottom: 0; }
	:global([data-theme='dark']) .app-page { --app-accent: #efa878; }
	:global([data-theme='high-contrast']) .app-page { --app-accent: #ffc091; }
	.app-hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; padding: 48px 0 52px; overflow: clip; }
	.hero-copy { padding: 14px 0 24px; }
	.eyebrow { display: flex; align-items: center; gap: 9px; margin: 0 0 24px; font-size: 11px; font-weight: 500; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); }
	.availability { width: 6px; height: 6px; border-radius: 50%; background: var(--app-accent); }
	h1 { margin: 0 0 28px; font-size: clamp(60px, 7.6vw, 98px); line-height: 0.97; font-weight: 550; letter-spacing: -0.065em; }
	h1 span { color: var(--app-accent); }
	.hero-description { max-width: 35ch; margin: 0 0 30px; font-size: 18px; line-height: 1.65; color: var(--muted); text-wrap: pretty; }
	.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; }
	.store-link { display: inline-flex; align-items: center; gap: 12px; padding: 12px 18px; min-height: 60px; background: var(--ink); color: var(--paper); border: 1px solid var(--ink); border-radius: 12px; transition: transform 200ms ease, box-shadow 200ms ease; }
	.store-link:hover { text-decoration: none; transform: translateY(-2px); box-shadow: 0 8px 20px -10px #281c1650; }
	.store-link:active { transform: translateY(0); }
	.store-link small, .store-link strong { display: block; }
	.store-link small { font-size: 10px; letter-spacing: 0.02em; line-height: 1.4; }
	.store-link strong { font-size: 20px; font-weight: 500; letter-spacing: -0.03em; line-height: 1.2; }
	.store-arrow { margin-left: 14px; font-size: 20px; }
	.text-link { display: inline-flex; align-items: center; gap: 14px; min-height: 44px; font-size: 13px; font-weight: 500; text-underline-offset: 5px; }
	.text-link span { transition: transform 200ms ease; }
	.text-link:hover span { transform: translate(2px, -2px); }
	.download-note { font-size: 11px; color: var(--muted); margin: 14px 0 0; }
	.hero-footnote { display: flex; align-items: center; gap: 14px; margin-top: 50px; }
	.hero-footnote p { margin: 0; font-size: 12px; line-height: 1.7; }
	.hero-footnote p span { color: var(--muted); }
	.mini-grid { width: 32px; height: 32px; flex-shrink: 0; border: 1px solid var(--faint); background: repeating-linear-gradient(0deg, transparent 0 9px, var(--grid-strong) 9px 10px), repeating-linear-gradient(90deg, transparent 0 9px, var(--grid-strong) 9px 10px); transform: rotate(-8deg); }
	.phone-stage { position: relative; padding: 4px 0 0; --phone-width: 270px; }
	.phone-halo { position: absolute; inset: 12% -10% 12%; border: 1px solid var(--grid-strong); border-radius: 50%; background: radial-gradient(ellipse, #db9e6720, transparent 70%); transform: rotate(-18deg); }
	.phone-halo::after { content: ''; position: absolute; inset: -25px; border: 1px solid var(--grid); border-radius: inherit; }
	.product-strip { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; border-block: 1px solid var(--grid-strong); font-size: 11px; }
	.product-strip > span { font-family: var(--mono); font-size: 10px; color: var(--muted); }
	.product-strip p { display: flex; flex-wrap: wrap; gap: 18px; margin: 0; }
	.product-strip i { color: var(--faint); font-style: normal; }
	.product-strip a { display: inline-flex; align-items: center; gap: 20px; min-height: 44px; }
	.app-section { padding: 96px 0; scroll-margin-top: 100px; }
	.features, .engine-section { display: grid; grid-template-columns: 1fr 1.1fr; gap: 100px; }
	h2 { margin: 0 0 24px; font: 500 clamp(32px, 3.8vw, 48px)/1.1 var(--serif); letter-spacing: -0.045em; text-wrap: balance; }
	h2 em { font-weight: 400; color: var(--app-accent); }
	.section-intro > p:not(.eyebrow), .section-heading > p, .engine-copy > p { max-width: 43ch; margin: 0 0 20px; font-size: 15px; color: var(--muted); line-height: 1.75; text-wrap: pretty; }
	.feature { display: grid; grid-template-columns: 28px 1fr; gap: 22px; padding: 27px 0; border-bottom: 1px solid var(--grid-strong); }
	.feature:first-child { padding-top: 0; }
	.feature:last-child { border-bottom: 0; padding-bottom: 0; }
	.feature-number { padding-top: 4px; color: var(--app-accent); font: 11px var(--mono); }
	.feature h3 { margin: 0 0 10px; font-size: 18px; font-weight: 500; letter-spacing: -0.025em; }
	.feature p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.75; }
	.demo-section { border-block: 1px solid var(--grid-strong); }
	.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 48px; margin-bottom: 32px; }
	.section-heading h2 { margin-bottom: 0; }
	.section-heading > p { max-width: 31ch; margin-bottom: 0; font-size: 13px; }
	.demo-shell { padding: 8px; border: 1px solid var(--grid-strong); border-radius: 20px; background: color-mix(in srgb, var(--paper2) 70%, transparent); }
	.demo-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 14px 16px; }
	.demo-label { font: 10px var(--mono); color: var(--muted); }
	.demo-panel { min-width: 0; }
	.demo-panel img { width: 100%; height: auto; max-height: 560px; object-fit: contain; background: #151820; display: block; border-radius: 12px; }
	.demo-caption { display: flex; align-items: baseline; gap: 20px; padding: 12px 16px 8px; margin: 0; font-size: 12px; line-height: 1.65; }
	.demo-caption strong { font-weight: 500; white-space: nowrap; }
	.demo-caption span { color: var(--muted); }
	.engine-copy { padding-top: 4px; min-width: 0; }
	.source-links { display: flex; flex-wrap: wrap; gap: 8px 24px; }
	.developer-details { margin-top: 24px; border-top: 1px solid var(--grid-strong); font-size: 12px; }
	.developer-details summary { padding: 20px 0; cursor: pointer; color: var(--muted); }
	.developer-details p { line-height: 1.6; }
	.developer-details p a { text-decoration: underline; text-underline-offset: 3px; }
	.developer-details pre { max-width: 100%; margin: 0 0 16px; font-size: 10px; }
	.closing-section { text-align: center; padding: 64px 24px 72px; margin-bottom: 64px; border-radius: 28px; border: 1px solid var(--grid-strong); background: color-mix(in srgb, var(--paper2) 72%, transparent); }
	.closing-section > img { border-radius: 15px; margin-bottom: 24px; }
	.closing-section .eyebrow, .closing-section .hero-actions { justify-content: center; }
	.closing-section h2 { margin-bottom: 32px; }
	@media (max-width: 1050px) { .app-hero { gap: 28px; } .hero-actions { gap: 16px; } .features, .engine-section { gap: 48px; } .product-strip > span { display: none; } }
	@media (max-width: 760px) {
		.app-hero { grid-template-columns: 1fr; gap: 36px; padding: 44px 8px 40px; }
		.hero-copy { padding: 0; max-width: 500px; }
		h1 { font-size: clamp(62px, 12vw, 84px); margin-bottom: 24px; }
		.eyebrow { font-size: 10px; margin-bottom: 20px; }
		.hero-description { font-size: 16px; max-width: 35ch; margin-bottom: 24px; }
		.hero-footnote { display: none; }
		.phone-stage { --phone-width: 264px; padding-bottom: 4px; }
		.phone-halo { inset: 12% 8%; }
		.product-strip { padding: 18px 8px; }
		.product-strip p { font-size: 10px; gap: 8px 12px; line-height: 1.8; }
		.product-strip p i { display: none; }
		.product-strip a { display: none; }
		.app-section { padding: 64px 8px; }
		.features, .engine-section { grid-template-columns: 1fr; gap: 36px; }
		.section-heading { display: block; margin-bottom: 24px; }
		.section-heading > p { max-width: 43ch; margin-top: 20px; }
		.demo-toolbar { padding-inline: 8px; }
		.demo-caption { display: block; padding-inline: 8px; }
		.demo-caption strong { display: block; margin-bottom: 4px; }
		.closing-section { padding: 48px 20px 56px; margin-bottom: 40px; }
		.closing-section .hero-actions { flex-direction: column; gap: 12px; }
	}
	@media (max-width: 370px) { .hero-actions { gap: 10px; } .store-link { padding: 11px 12px; } .store-arrow { margin-left: 0; } .text-link { gap: 8px; font-size: 12px; } }
</style>
