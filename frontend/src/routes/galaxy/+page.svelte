<script lang="ts">
 import { onMount } from 'svelte';
 import SeoHead from '$lib/components/SeoHead.svelte';
 import GalaxyGraph from '$lib/galaxy/GalaxyGraph.svelte';
 import GalaxyFilters from '$lib/galaxy/GalaxyFilters.svelte';
 import GalaxyStats from '$lib/galaxy/GalaxyStats.svelte';
 import TechniqueStarKey from '$lib/galaxy/TechniqueStarKey.svelte';
 import { galaxyStore, TECHNIQUE_FAMILIES, SECRET_FAMILIES, nodePrimaryFamily } from '$lib/stores/galaxy.svelte';
 import { playerStore } from '$lib/stores/player.svelte';
 let filtersOpen = $state(false);
 let filterButton: HTMLButtonElement;
 let families = $derived(Object.entries(TECHNIQUE_FAMILIES).filter(([key]) => playerStore.secrets || !SECRET_FAMILIES.has(key)).map(([key, family]) => ({ key, ...family, count: galaxyStore.nodes.filter(node => nodePrimaryFamily(node) === key).length })));
 let chartedCount = $derived(families.reduce((sum, family) => sum + family.count, 0));
 function explore(key: string | null) {
  if (key && !galaxyStore.activeFilters.has(key)) galaxyStore.toggleFilter(key);
  galaxyStore.selectNode(null); galaxyStore.focusFamily(key); filtersOpen = false;
 }
 function closeFilters(event: KeyboardEvent) { if (event.key === 'Escape' && filtersOpen) { filtersOpen = false; filterButton.focus(); } }
 onMount(() => galaxyStore.initWithSecrets(playerStore.secrets));
</script>

<svelte:window onkeydown={closeFilters} />
<SeoHead title="Sudoku Galaxy — Ukodus" description="An interactive night sky of Sudoku puzzles. Explore constellations of shared solving techniques and discover your next challenge." url="https://ukodus.now/galaxy/" image="https://ukodus.now/assets/og-galaxy.png" />

<main id="main-content" tabindex="-1" class="observatory">
 <header class="observatory-heading">
  <div><p class="observatory-kicker"><span aria-hidden="true">✦</span> THE SUDOKU GALAXY</p><h1>Find your <em>constellation.</em></h1></div>
  <div class="observatory-intro"><p>Every puzzle is a star.<br />Follow a thread of logic. Discover a new perspective.</p><a href="/play/">Add your next discovery <span aria-hidden="true">↗</span></a></div>
 </header>
 <div class="atlas-navigation">
  <nav class="constellation-rail" aria-label="Choose a constellation">
   <button class:active={!galaxyStore.focusedFamily && !galaxyStore.focusedTechnique} aria-pressed={!galaxyStore.focusedFamily && !galaxyStore.focusedTechnique} onclick={() => explore(null)}><span class="rail-star" aria-hidden="true">✦</span><span>All constellations</span><span class="rail-count">{chartedCount}</span></button>
   {#each families as family}
    <button class:active={galaxyStore.focusedFamily === family.key} aria-pressed={galaxyStore.focusedFamily === family.key} disabled={!family.count} onclick={() => explore(family.key)}><span>{family.label}</span><span class="rail-count">{family.count}</span></button>
   {/each}
  </nav>
  <button class="filter-toggle" bind:this={filterButton} aria-label="Filter sky" aria-expanded={filtersOpen} aria-controls="galaxy-filter-list" onclick={() => filtersOpen = !filtersOpen}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M3 6h14M3 14h14M7 3v6M13 11v6" /></svg><span>Filter sky</span></button>
  {#if filtersOpen}<aside id="galaxy-filter-list" class="filter-popover" aria-label="Galaxy filters"><GalaxyFilters /></aside>{/if}
 </div>
 <GalaxyGraph />
 <section class="atlas-notes" aria-label="Reading the sky">
  <div class="atlas-description"><span class="section-number">01 / READING THE SKY</span><h2>A little logic.<br /><em>A much bigger picture.</em></h2><p>Every selectable object is a real puzzle. Their constellations are formed by solving techniques. Follow a connection, find a challenge, and make your own discovery.</p></div>
  <div class="atlas-legend"><div><span class="legend-symbol star-symbol" aria-hidden="true">✦</span><p><strong>One star, one puzzle</strong><span>Select a puzzle to see its difficulty, solving techniques, and best times.</span></p></div><div><span class="legend-symbol line-symbol" aria-hidden="true"></span><p><strong>Connected by logic</strong><span>Lines show catalog connections or a shared named technique.</span></p></div><div><span class="legend-symbol field-symbol" aria-hidden="true">· ⁙ ·</span><p><strong>A sky with room to grow</strong><span>Explore familiar techniques, try a new challenge, and add your next puzzle to the galaxy.</span></p></div></div>
 </section>
 <TechniqueStarKey />
 <GalaxyStats />
</main>

<style>
 .observatory { max-width: 1500px; width: calc(100% - 72px); margin: 0 auto; padding: 44px 0 64px; }
 .observatory-heading { display: flex; align-items: end; justify-content: space-between; gap: 40px; padding-bottom: 36px; }
 .observatory-kicker { display: flex; align-items: center; gap: 10px; font: 9px var(--mono); letter-spacing: .18em; color: #9cabc0; margin: 0 0 20px; }
 .observatory-kicker span { color: #d9e7f6; font-size: 15px; }
 h1 { font: 450 clamp(34px, 4.2vw, 60px)/1.12 var(--serif); letter-spacing: -.045em; margin: 0; }
 h1 em { font-weight: 400; color: #b7c9df; }
 .observatory-intro { padding-bottom: 3px; flex-shrink: 0; }
 .observatory-intro p { font-size: 13px; line-height: 1.8; color: #a4b2c6; margin: 0 0 10px; }
 .observatory-intro a { display: inline-flex; gap: 24px; align-items: center; min-height: 36px; font-size: 11px; color: #d8e4f3; }
 .atlas-navigation { display: flex; position: relative; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
 .constellation-rail { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: thin; scrollbar-color: #465870 transparent; padding: 2px 0 6px; min-width: 0; }
 .constellation-rail button { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px 15px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: #9aadc5; white-space: nowrap; font-size: 11px; transition: background 180ms, color 180ms; }
 .constellation-rail button:hover:not(:disabled) { color: #edf4ff; background: #adcaee0c; }
 .constellation-rail button.active { color: #e6effb; border-color: #94afd42e; background: #adc8eb0c; }
 .constellation-rail button:disabled { opacity: .36; }
 .rail-star { color: #d8e9fb; font-size: 15px; }
 .rail-count { color: #93a9c5; font: 9px var(--mono); }
 .filter-toggle { display: flex; gap: 8px; align-items: center; justify-content: center; flex-shrink: 0; min-height: 44px; padding: 10px 14px; border: 1px solid #94afd42e; background: #0c1522; border-radius: 8px; font-size: 11px; color: #b5c5da; }
 .filter-toggle:hover, .filter-toggle[aria-expanded='true'] { background: #18263a; }
 .filter-popover { position: absolute; z-index: 7; top: calc(100% + 6px); right: 0; width: 310px; max-width: 100%; padding: 24px; border: 1px solid #a1b5d137; border-radius: 14px; background: #0d1725f5; backdrop-filter: blur(24px); box-shadow: 0 20px 60px #0007; }
 .atlas-notes { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; padding: 64px 20px 56px; border-bottom: 1px solid #9eafc521; }
 .section-number { display: block; margin-bottom: 22px; color: #8fa3be; font: 9px var(--mono); letter-spacing: .13em; }
 .atlas-description h2 { font: 400 34px/1.22 var(--serif); letter-spacing: -.02em; margin: 0 0 20px; }
 .atlas-description h2 em { color: #a7bbd5; font-weight: 400; }
 .atlas-description p { color: #91a3bc; font-size: 13px; line-height: 1.9; max-width: 48ch; margin: 0; }
 .atlas-legend { display: grid; gap: 24px; padding-top: 6px; }
 .atlas-legend > div { display: flex; gap: 20px; align-items: start; }
 .legend-symbol { display: flex; align-items: center; justify-content: center; width: 34px; height: 36px; flex-shrink: 0; color: #d6e7fb; }
 .star-symbol { font-size: 25px; text-shadow: 0 0 16px #b8d7ff80; }
 .line-symbol { height: 1px; margin-top: 16px; background: #c7daf0; transform: rotate(-24deg); box-shadow: 0 0 8px #b8d7ff40; }
 .field-symbol { font-size: 20px; color: #8b9eb8; }
 .atlas-legend p { margin: 0; }
 .atlas-legend strong { display: block; color: #d1dfef; font-size: 12px; font-weight: 500; margin-bottom: 8px; }
 .atlas-legend p span { display: block; color: #8fa2bc; font-size: 12px; line-height: 1.8; max-width: 42ch; }
 @media (max-width: 1100px) { .observatory-heading { gap: 24px; } .observatory-intro { max-width: 270px; } .constellation-rail button { padding-inline: 11px; } .atlas-notes { gap: 48px; } }
 @media (max-width: 760px) { .observatory { width: calc(100% - 28px); padding-top: 30px; } .observatory-heading { display: block; padding: 0 4px 24px; } .observatory-kicker { font-size: 8px; margin-bottom: 16px; } h1 { max-width: 13ch; font-size: 43px; } .observatory-intro { max-width: none; margin-top: 20px; } .observatory-intro p { font-size: 12px; } .observatory-intro a { min-height: 36px; } .atlas-navigation { gap: 8px; margin-bottom: 10px; } .filter-toggle { padding: 10px; } .filter-toggle span { display: none; } .constellation-rail button { padding-inline: 12px; } .atlas-notes { grid-template-columns: 1fr; gap: 32px; padding: 42px 12px; } .atlas-description h2 { font-size: 30px; } .atlas-description p { font-size: 12px; } }
 :global([data-theme='high-contrast']) .observatory p, :global([data-theme='high-contrast']) .atlas-legend p span { color: #dbe6f5; }
</style>
