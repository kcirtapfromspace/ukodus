<script lang="ts">
 import { tick } from 'svelte';
 import { galaxyStore, nodePrimaryFamily, SECRET_FAMILIES } from '$lib/stores/galaxy.svelte';
 import { playerStore } from '$lib/stores/player.svelte';
 import { techniqueStellarMapping, stellarAppearance, techniqueLabel } from './celestial';
 let mappings = $derived(techniqueStellarMapping(galaxyStore.nodes).filter(row => playerStore.secrets || !SECRET_FAMILIES.has(nodePrimaryFamily(row.puzzles[0]))));
 async function explore(technique: string) {
  galaxyStore.focusTechnique(technique);
  await tick();
  document.getElementById('galaxy-svg')?.closest('.galaxy-main')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  document.querySelector<HTMLButtonElement>('.zoom-back-btn')?.focus({ preventScroll: true });
 }
</script>

<section class="technique-key" aria-labelledby="technique-key-title">
 <span class="section-number">02 / SOLVING TECHNIQUES</span>
 <div class="key-heading"><h2 id="technique-key-title">Explore by technique.</h2><a href="/techniques/">Learn the techniques <span aria-hidden="true">↗</span></a></div>
 <p>Practice a familiar technique or try something new. Choose one to find its puzzles in the galaxy.</p>
 {#if galaxyStore.loading && !mappings.length}<p>Finding puzzles…</p>
 {:else if !mappings.length}<p>{galaxyStore.error ? 'Techniques will appear when the puzzles load.' : 'Play a puzzle to start exploring its techniques.'}</p>
 {:else}
  <div class="mapping-list">
   {#each mappings as row (row.technique)}
    <button class="mapping-row" aria-label={`Explore ${techniqueLabel(row.technique)} puzzles`} aria-pressed={galaxyStore.focusedTechnique === row.technique} onclick={() => explore(row.technique)}>
     <span class="technique-name">{techniqueLabel(row.technique)}<small>{row.count} {row.count === 1 ? 'puzzle' : 'puzzles'}</small></span>
     <span class="row-decoration" aria-hidden="true">{#each row.types as entry (entry.type.spectral)}{@const look = stellarAppearance(entry.type, 'infrared')}<i class:outlined={look.markerOnly} style:color={look.tint}></i>{/each}<span class="explore-arrow">↗</span></span>
    </button>
   {/each}
  </div>
 {/if}
</section>

<style>
 .technique-key { padding: 48px 20px; border-bottom: 1px solid #9eafc521; }
 .section-number { display: block; margin-bottom: 20px; color: #8fa3be; font: 9px var(--mono); letter-spacing: .13em; }
 .key-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
 h2 { margin: 0; font: 400 32px/1.3 var(--serif); color: #e5eaf2; }
 .key-heading a { display: inline-flex; align-items: center; gap: 14px; min-height: 44px; color: #b8c8dc; font-size: 12px; text-underline-offset: 5px; }
 .key-heading a:hover { text-decoration: underline; }
 p { font-size: 12px; line-height: 1.8; color: #a2b2c9; max-width: 65ch; margin: 14px 0 22px; }
 .mapping-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 36px; }
 .mapping-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 0; padding: 18px 0; border: 0; border-bottom: 1px solid #a5b4cb26; background: transparent; color: #dce5f2; text-align: left; transition: background 150ms; }
 .mapping-row:hover, .mapping-row[aria-pressed='true'] { background: #a2c9f20b; }
 .technique-name { font-size: 13px; overflow-wrap: anywhere; min-width: 0; }
 .technique-name > small { display: block; font: 10px var(--mono); color: #98aac1; margin-top: 7px; }
 .row-decoration { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
 i { display: inline-block; width: 5px; height: 5px; background: currentColor; border: 1px solid currentColor; border-radius: 50%; box-shadow: 0 0 7px currentColor; }
 i.outlined { background: transparent; box-shadow: none; }
 .explore-arrow { color: #a1b2c9; margin-left: 16px; }
 @media (max-width: 760px) { .technique-key { padding: 36px 12px; } .mapping-list { grid-template-columns: minmax(0, 1fr); } .key-heading { display: block; } h2 { font-size: 29px; } .key-heading a { margin-top: 8px; } }
 :global([data-theme='high-contrast']) p, :global([data-theme='high-contrast']) small { color: #e0e7f0; }
</style>
