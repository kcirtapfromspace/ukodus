<script lang="ts">
	import { page } from '$app/state';
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead title="{page.status} — Ukodus" description="Page not found." url="https://ukodus.now/" noindex />

<main id="main-content" tabindex="-1" class="wrap error-page">
	<section class="error-intro">
		<div>
			<h1>{page.status}</h1>
			<p class="subtitle">
				{#if page.status === 404}
					This page doesn't exist. Maybe you were looking for a puzzle?
				{:else}
					Something went wrong.
				{/if}
			</p>

			<div class="cta">
				<a class="btn primary" href="/play/">
					<span class="dot" aria-hidden="true"></span>
					Play Sudoku
				</a>
				<a class="btn" href="/galaxy/">Explore Galaxy</a>
				<a class="btn" href="/">Home</a>
			</div>
		</div>
	</section>
</main>

<style>.error-intro { padding: 64px 0 100px; max-width: 700px; } h1 { color: var(--accent); font-size: clamp(80px, 15vw, 160px); } .subtitle { font-size: 20px; }</style>
