<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import GalaxyGraph from '$lib/galaxy/GalaxyGraph.svelte';
	import GalaxyFilters from '$lib/galaxy/GalaxyFilters.svelte';
	import GalaxyStats from '$lib/galaxy/GalaxyStats.svelte';
	import GalaxyDetail from '$lib/galaxy/GalaxyDetail.svelte';
	import { galaxyStore } from '$lib/stores/galaxy.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		galaxyStore.initWithSecrets(playerStore.secrets);
	});
</script>

<SeoHead
	title="Sudoku Galaxy — Ukodus"
	description="Explore the Sudoku Galaxy: an interactive force-directed visualization of thousands of puzzles, clustered by solving technique and difficulty."
	url="https://ukodus.now/galaxy/"
	image="https://ukodus.now/assets/og-galaxy.png"
/>

<main class="wrap">
	<div class="galaxy-layout">
		<aside class="galaxy-sidebar">
			<GalaxyFilters />
			<GalaxyStats />
			<GalaxyDetail />
		</aside>
		<GalaxyGraph />
	</div>
</main>

<style>
	.galaxy-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 0;
		min-height: calc(100vh - 120px);
		margin-top: 14px;
	}
	.galaxy-sidebar {
		border-right: 1px solid rgba(20, 20, 20, 0.10);
		padding: 20px 20px 20px 0;
		display: flex;
		flex-direction: column;
		gap: 24px;
		overflow-y: auto;
		max-height: calc(100vh - 120px);
		position: sticky;
		top: 64px;
	}

	:global([data-theme='dark']) .galaxy-sidebar {
		border-right-color: rgba(255, 255, 255, 0.08);
	}

	@media (max-width: 940px) {
		.galaxy-layout { grid-template-columns: 1fr; }
		.galaxy-sidebar {
			position: static; max-height: none;
			border-right: none;
			border-bottom: 1px solid rgba(20, 20, 20, 0.10);
			padding: 16px 0;
			flex-direction: row; flex-wrap: wrap;
			gap: 16px; overflow-y: visible;
		}
		:global([data-theme='dark']) .galaxy-sidebar {
			border-bottom-color: rgba(255, 255, 255, 0.08);
		}
	}
</style>
