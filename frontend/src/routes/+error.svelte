<script lang="ts">
	import { page } from '$app/state';
	import SeoHead from '$lib/components/SeoHead.svelte';
</script>

<SeoHead title="{page.status} — Ukodus" description="Page not found." url="https://ukodus.now/" noindex />

<main class="wrap">
	<section class="hero" style="grid-template-columns:1fr; text-align:center; padding:60px 0 40px;">
		<div>
			<h1 style="font-size:clamp(48px,6vw,80px);">{page.status}</h1>
			<p class="subtitle" style="margin:0 auto;">
				{#if page.status === 404}
					This page doesn't exist. Maybe you were looking for a puzzle?
				{:else}
					Something went wrong.
				{/if}
			</p>

			<div class="cta" style="justify-content:center; margin-top:28px;">
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
