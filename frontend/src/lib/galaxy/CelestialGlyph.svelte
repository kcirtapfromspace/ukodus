<script lang="ts">
 import { stellarAppearance, type CelestialType, type ObservationMode } from './celestial';
 let { type, mode = 'visible' }: { type: CelestialType; mode?: ObservationMode } = $props();
 const gradient = $props.id();
 let look = $derived(stellarAppearance(type, mode));
</script>
<g class="celestial-glyph" data-spectral-type={type.spectral} data-marker-only={look.markerOnly} style:color={look.tint} style:opacity={.65 + look.exposure * .35} aria-hidden="true">
 {#if look.markerOnly}
  <circle class="reference-marker" r={look.radius} />
  {#if type.spectral === 'D'}<circle class="reference-marker" r="1" />{:else}<path class="reference-marker" d="M-6 0h1M5 0h1M0-6v1M0 5v1" />{/if}
 {:else}
  <defs><radialGradient id={gradient}><stop stop-color={look.tint} stop-opacity=".6" /><stop offset=".24" stop-color={look.tint} stop-opacity=".18" /><stop offset="1" stop-color={look.tint} stop-opacity="0" /></radialGradient></defs>
  <circle class="star-bloom" r={look.radius * 8} fill={`url(#${gradient})`} />
  <path class="star-rays" style:opacity={.15 + look.exposure * .6} d={`M${-look.radius * 3.5},0h${look.radius * 7}M0,${-look.radius * 3.5}v${look.radius * 7}`} />
  <circle class="star-core" r={look.radius} />
 {/if}
</g>
<style>
 .celestial-glyph { pointer-events: none; transition: color 450ms, opacity 450ms; }
 .star-core { fill: currentColor; filter: drop-shadow(0 0 3px currentColor); }
 .star-bloom { opacity: .85; }
 .star-rays, .reference-marker { fill: none; stroke: currentColor; stroke-width: .65; }
 .reference-marker { stroke-width: .85; }
 @media (prefers-reduced-motion: reduce) { .celestial-glyph { transition: none; } }
</style>
