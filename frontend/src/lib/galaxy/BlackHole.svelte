<script lang="ts">
 let { compact = false }: { compact?: boolean } = $props();
 const glow = $props.id();
</script>
<g class="black-hole" class:compact aria-hidden="true">
 <defs><radialGradient id={glow}><stop offset=".2" stop-color="#f5ba86" stop-opacity="0" /><stop offset=".43" stop-color="#eaa366" stop-opacity=".23" /><stop offset="1" stop-color="#a988e3" stop-opacity="0" /></radialGradient></defs>
 <circle r="72" fill={`url(#${glow})`} />
 <g class="accretion-disc"><ellipse rx="48" ry="13" /><ellipse rx="40" ry="9" /><ellipse class="disc-outer" rx="55" ry="17" /></g>
 <circle class="event-horizon" r="17" />
 <path class="lensed-light" d="M-32 0C-20-3-20-27 0-27S20-3 32 0" />
 <path class="disc-front" d="M-48 0C-29 16 29 16 48 0" />
 <circle class="photon-ring" r="19.5" />
</g>
<style>
 .black-hole { pointer-events: none; }
 .accretion-disc { fill: none; stroke: #efbe8f; stroke-width: 2; transform: rotate(-14deg); filter: drop-shadow(0 0 4px #e68d5c); animation: accretion 9s ease-in-out infinite alternate; animation-play-state: var(--celestial-motion, running); }
 .disc-outer { opacity: .3; stroke-width: .7; }
 .event-horizon { fill: #020307; }
 .photon-ring { fill: none; stroke: #fbe2be; stroke-width: .8; opacity: .8; }
 .lensed-light { fill: none; stroke: #edc79f; stroke-width: 1.4; filter: drop-shadow(0 0 3px #efa66f); opacity: .8; }
 .disc-front { fill: none; stroke: #ffe0b4; stroke-width: 2.5; transform: rotate(-14deg); filter: drop-shadow(0 0 3px #e99859); }
 .compact .accretion-disc { animation: none; }
 @keyframes accretion { from { opacity: .65; } to { opacity: 1; } }
 @media (prefers-reduced-motion: reduce) { .accretion-disc { animation: none; } }
</style>
