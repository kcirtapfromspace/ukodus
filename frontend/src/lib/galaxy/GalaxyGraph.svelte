<script lang="ts">
 import { onMount, onDestroy, untrack } from 'svelte';
 import * as d3 from 'd3';
 import { galaxyStore, TECHNIQUE_FAMILIES, SECRET_FAMILIES, nodePrimaryTechnique } from '$lib/stores/galaxy.svelte';
 import { playerStore } from '$lib/stores/player.svelte';
 import { posthogStore } from '$lib/stores/posthog.svelte';
 import { buildConstellations, FAMILY_STORIES, stableRandom, type Star } from './constellations';
 import Starfield from './Starfield.svelte';
 import GalaxyDetail from './GalaxyDetail.svelte';
 import CelestialGlyph from './CelestialGlyph.svelte';
 import BlackHole from './BlackHole.svelte';
 import { techniqueLabel } from './celestial';

 let svgEl: SVGSVGElement;
 let sceneEl: SVGGElement;
 let stageEl: HTMLDivElement;
 let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
 let ready = $state(false);
 let disposed = false;
 let paused = $state(false);
 let introComplete = $state(false);
 let reducedMotion = $state(false);
 let showLines = $state(true);
 let hovered = $state<Star | null>(null);
 let keyboardStar = $state('');
 let tooltipX = $state(0), tooltipY = $state(0);
 let resizeTimer: ReturnType<typeof setTimeout> | undefined;
 let motionQuery: MediaQueryList | undefined;
 let atlas = $derived(buildConstellations(galaxyStore.nodes, galaxyStore.edges));
 let visibleStars = $derived(atlas.stars.filter(star => galaxyStore.activeFilters.has(star.family)));
 let focused = $derived(galaxyStore.focusedFamily);
 let technique = $derived(galaxyStore.focusedTechnique);
 let focusKey = $derived(technique ?? focused);
 // Keep the data-backed color treatment behind the puzzle experience.
 const mode = 'infrared';
 let scopedStars = $derived(visibleStars.filter(star => (!focused || star.family === focused) && (!technique || nodePrimaryTechnique(star) === technique)));
 let tabStar = $derived(scopedStars.some(star => star.id === keyboardStar) ? keyboardStar : scopedStars[0]?.id);
 let motionOff = $derived(paused || reducedMotion);
 let cameraKey = $derived(scopedStars.map(star => star.id).join('|') + ':' + focusKey);
 let focusTitle = $derived(technique ? techniqueLabel(technique) : focused ? TECHNIQUE_FAMILIES[focused]?.label : 'The open sky');
 let highlighted = $derived(hovered?.id ?? galaxyStore.selectedNode?.id);
 let connectedIds = $derived.by(() => {
  const ids = new Set<string>();
  if (highlighted) {
   ids.add(highlighted);
   for (const link of atlas.links) {
    if (link.source.id === highlighted) ids.add(link.target.id);
    if (link.target.id === highlighted) ids.add(link.source.id);
   }
  }
  return ids;
 });

 function visible(star: Star) { return galaxyStore.activeFilters.has(star.family); }
 function inScope(star: Star) { return visible(star) && (!focused || star.family === focused) && (!technique || nodePrimaryTechnique(star) === technique); }
 function flyTo(animate = true) {
  if (!ready || !zoom || !scopedStars.length) return;
  const { width, height } = svgEl.getBoundingClientRect();
  const xs = scopedStars.map(star => star.x), ys = scopedStars.map(star => star.y);
  const left = Math.min(...xs) - 100, right = Math.max(...xs) + 100;
  const top = Math.min(...ys) - 85, bottom = Math.max(...ys) + 115;
  const scale = Math.min(focusKey ? 2.4 : 1.15, width / (right - left), (height - 100) / (bottom - top));
  const transform = d3.zoomIdentity.translate(width / 2 - (left + right) * scale / 2, height / 2 - (top + bottom) * scale / 2 + 12).scale(scale);
  const selection = d3.select(svgEl).interrupt();
  if (animate && !motionOff) selection.transition().duration(950).ease(d3.easeCubicInOut).call(zoom.transform, transform);
  else selection.call(zoom.transform, transform);
 }
 function zoomBy(factor: number) {
  if (!ready) return;
  const selection = d3.select(svgEl).interrupt();
  if (motionOff) selection.call(zoom.scaleBy, factor);
  else selection.transition().duration(350).call(zoom.scaleBy, factor);
 }
 function selectStar(star: Star) {
  galaxyStore.selectNode(galaxyStore.nodes.find(node => node.id === star.id) ?? star);
  posthogStore.captureEvent('galaxy_node_clicked', { puzzle_hash: star.puzzle_hash });
  hovered = null;
 }
 function closeDetails() {
  const selected = galaxyStore.selectedNode?.id;
  galaxyStore.selectNode(null);
  [...svgEl.querySelectorAll<SVGCircleElement>('.galaxy-node')].find(star => star.dataset.starId === selected)?.focus({ preventScroll: true });
 }
 function selectPointerStar(event: MouseEvent, fallback: Star) {
  if (!event.detail || !ready) { selectStar(fallback); return; }
  const rect = svgEl.getBoundingClientRect();
  const [x, y] = d3.zoomTransform(svgEl).invert([event.clientX - rect.left, event.clientY - rect.top]);
  // Generous touch targets may overlap. Always select the nearest visible star.
  const closest = scopedStars.reduce((best, star) => Math.hypot(star.x - x, star.y - y) < Math.hypot(best.x - x, best.y - y) ? star : best, fallback);
  selectStar(closest);
 }
 function moveTooltip(event: MouseEvent) {
  const rect = stageEl.getBoundingClientRect();
  tooltipX = Math.max(12, Math.min(event.clientX - rect.left + 18, rect.width - 232));
  tooltipY = Math.max(88, Math.min(event.clientY - rect.top - 72, rect.height - 150));
 }
 function showTooltip(event: MouseEvent, star: Star) { hovered = star; moveTooltip(event); }
 function onStarKey(event: KeyboardEvent, star: Star) {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); selectStar(star); }
  else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
   event.preventDefault(); event.stopPropagation();
   const circles = [...svgEl.querySelectorAll<SVGCircleElement>('.galaxy-node:not(.dimmed):not(.dimmed-family)')];
   const index = circles.indexOf(event.currentTarget as SVGCircleElement);
   const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
   const next = circles[(index + direction + circles.length) % circles.length];
   if (next) { keyboardStar = next.dataset.starId ?? ''; next.focus(); }
  } else if (event.key === 'Escape') { event.preventDefault(); galaxyStore.selectNode(null); galaxyStore.focusFamily(null); }
 }
 function focusConstellation(key: string) { galaxyStore.selectNode(null); galaxyStore.focusFamily(key); }
 function handleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => flyTo(false), 180); }
 function updateMotion() { reducedMotion = motionQuery?.matches ?? false; if (reducedMotion && ready) d3.select(svgEl).interrupt(); }

 onMount(() => {
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  updateMotion(); motionQuery?.addEventListener?.('change', updateMotion);
  zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([.12, 6])
   .extent((): [[number, number], [number, number]] => { const { width, height } = svgEl.getBoundingClientRect(); return [[0, 0], [width, height]]; })
   .on('zoom', (event) => { d3.select(sceneEl).attr('transform', event.transform); svgEl.style.setProperty('--label-scale', String(1 / event.transform.k)); svgEl.style.setProperty('--label-opacity', String(Math.max(0, Math.min(1, (event.transform.k - .18) / .06)))); svgEl.classList.toggle('distant-view', event.transform.k < .2); hovered = null; });
  d3.select(svgEl).call(zoom).on('dblclick.zoom', null);
  window.addEventListener('resize', handleResize);
  galaxyStore.fetchData().then(() => {
   if (disposed) return;
   ready = true;
   galaxyStore.connectWebSocket();
  });
 });
 let previousFocus: string | null = null;
 $effect(() => {
  cameraKey;
  if (ready) untrack(() => { const animate = focusKey !== previousFocus; previousFocus = focusKey; flyTo(animate); });
 });
 $effect(() => { if (motionOff) { introComplete = true; if (ready) d3.select(svgEl).interrupt(); } });
 onDestroy(() => {
  disposed = true;
  clearTimeout(resizeTimer);
  window.removeEventListener('resize', handleResize);
  motionQuery?.removeEventListener?.('change', updateMotion);
  if (svgEl) d3.select(svgEl).interrupt().on('.zoom', null);
  galaxyStore.disconnectWebSocket();
 });
</script>

<div class="galaxy-main" class:motion-paused={motionOff} class:intro-complete={introComplete} class:lines-hidden={!showLines} class:has-selection={!!galaxyStore.selectedNode} bind:this={stageEl} aria-busy={galaxyStore.loading}>
 <Starfield paused={motionOff} {mode} />
 <div class="sky-toolbar">
  <div class="sky-location"><span class="status-light" aria-hidden="true"></span><div><span class="eyebrow">{technique ? 'TECHNIQUE' : focused ? 'CONSTELLATION' : 'PUZZLE ATLAS'}</span><strong>{focusTitle}</strong></div></div>
  <div class="sky-controls">
   <button class="motion-toggle" disabled={reducedMotion} onclick={() => paused = !paused} aria-pressed={motionOff} aria-label={reducedMotion ? 'Motion reduced by device setting' : paused ? 'Resume motion' : 'Pause motion'} title={reducedMotion ? 'Your device prefers reduced motion' : 'Toggle ambient animation'}><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">{#if motionOff}<path d="m5 3 7 5-7 5Z" fill="currentColor" />{:else}<path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="2" />{/if}</svg><span>{motionOff ? 'Motion off' : 'Motion on'}</span></button>
   <button class="line-toggle" aria-pressed={showLines} onclick={() => showLines = !showLines}>Connections</button>
  </div>
 </div>
 {#if focusKey}<button class="zoom-back-btn" onclick={() => { galaxyStore.selectNode(null); galaxyStore.focusFamily(null); }}>← All constellations</button>{/if}
 <div class="sky-viewport">
  <svg bind:this={svgEl} id="galaxy-svg" role="group" aria-label="Interactive puzzle constellations. Arrow keys move between stars. Enter selects a puzzle. Drag to pan and scroll to zoom.">
   <g class="sky-entrance"><g bind:this={sceneEl} class="atlas-scene">
    {#if atlas.stars.length && !focusKey && visibleStars.length}
     <g class="black-hole-system" aria-hidden="true" transform="translate(770,430)"><BlackHole /></g>
    {/if}
    <g class="connections" aria-hidden="true">
     {#each atlas.links as link (link.id)}
      <line class="galaxy-edge" class:constellation-edge={link.kind === 'technique' || link.source.family === link.target.family} class:related={!!highlighted && (link.source.id === highlighted || link.target.id === highlighted)} class:muted={!!highlighted && link.source.id !== highlighted && link.target.id !== highlighted} class:out-of-scope={!inScope(link.source) || !inScope(link.target)} x1={link.source.x} y1={link.source.y} x2={link.target.x} y2={link.target.y} pathLength="1" />
     {/each}
    </g>
    <g class="stars">
     {#each atlas.stars as star (star.id)}
      <g class="star" class:out-of-scope={!inScope(star)} class:star-related={connectedIds.has(star.id)} class:star-selected={galaxyStore.selectedNode?.id === star.id} class:star-muted={!!highlighted && !connectedIds.has(star.id)} style={`--twinkle-delay: -${stableRandom(star.id) * 12}s; --twinkle-duration: ${5 + stableRandom(star.id + 'duration') * 6}s`}>
       <g transform={`translate(${star.x},${star.y})`}><CelestialGlyph type={star.celestial} {mode} /></g>
       <circle class="selection-ring" cx={star.x} cy={star.y} r={star.radius + 10} aria-hidden="true" />
       <circle class="galaxy-node" data-star-id={star.id} class:dimmed={!visible(star)} class:dimmed-family={(!!focused && focused !== star.family) || (!!technique && nodePrimaryTechnique(star) !== technique)} cx={star.x} cy={star.y} r="14" role="button" tabindex={tabStar === star.id ? 0 : -1} aria-label={`Puzzle ${star.short_code || star.puzzle_hash || star.id}, ${star.difficulty || 'unrated'}, ${star.play_count || 0} plays`} aria-pressed={galaxyStore.selectedNode?.id === star.id} aria-hidden={!inScope(star)} onclick={(event) => { event.stopPropagation(); selectPointerStar(event, star); }} onkeydown={(event) => onStarKey(event, star)} onmouseover={(event) => showTooltip(event, star)} onmousemove={moveTooltip} onmouseout={() => hovered = null} onfocus={() => { keyboardStar = star.id; hovered = null; }} onblur={() => hovered = null} />
      </g>
     {/each}
    </g>
    <g class="constellation-labels">
     {#each atlas.constellations as constellation (constellation.key)}
      {#if !technique && galaxyStore.activeFilters.has(constellation.key) && (!focused || focused === constellation.key)}
       <g class="constellation-label" role="button" tabindex="-1" aria-label={`Explore ${constellation.label} constellation`} onclick={() => focusConstellation(constellation.key)} onkeydown={(event) => { if (event.key === 'Enter') focusConstellation(constellation.key); }}>
        <g transform={`translate(${constellation.x},${constellation.y})`}><g class="label-content"><rect x="-66" y="-17" width="132" height="44" fill="transparent" /><text x="0" y="0" text-anchor="middle" class="family-label">{constellation.label}</text>
        <text x="0" y="18" text-anchor="middle" class="family-count">{String(constellation.stars.length).padStart(2, '0')} {constellation.stars.length === 1 ? 'PUZZLE' : 'PUZZLES'}</text></g></g>
       </g>
      {/if}
     {/each}
    </g>
   </g></g>
  </svg>
 </div>
 {#if galaxyStore.loading}
  <div class="map-state" role="status"><span class="loading-star" aria-hidden="true">✦</span><strong>Bringing the sky into focus.</strong><p>Finding the connections between puzzles.</p></div>
 {:else if galaxyStore.error && !atlas.stars.length}
  <div class="map-state" role="alert"><strong>We couldn’t load the galaxy.</strong><p>{galaxyStore.error}</p><button class="sky-action" onclick={() => galaxyStore.fetchData()}>Try again</button></div>
 {:else if !atlas.stars.length}
  <div class="map-state"><span class="loading-star" aria-hidden="true">✦</span><strong>A sky waiting to be discovered.</strong><p>No puzzles in the galaxy yet.</p><a class="sky-action" href="/play/">Play Now ↗</a></div>
 {:else if !scopedStars.length}
  <div class="map-state"><strong>No stars in this view.</strong><p>{focused ? 'This family has no visible puzzles yet. Explore another constellation.' : 'Turn on a constellation in the filters to see its puzzles.'}</p><button class="sky-action" onclick={() => { galaxyStore.focusFamily(null); galaxyStore.activeFilters = new Set(Object.keys(TECHNIQUE_FAMILIES).filter(key => playerStore.secrets || !SECRET_FAMILIES.has(key))); }}>Back to the atlas</button></div>
 {/if}
 {#if hovered && inScope(hovered)}
  <div class="galaxy-tooltip visible" style:left={`${tooltipX}px`} style:top={`${tooltipY}px`}><span class="tooltip-kicker">YOUR NEXT DISCOVERY</span><strong class="tt-hash">{hovered.short_code || hovered.puzzle_hash || '---'}</strong><div class="tt-row"><span>Difficulty</span><span class="tt-val">{hovered.difficulty || '?'}</span></div><div class="tt-row"><span>SE rating</span><span class="tt-val">{hovered.se_rating ?? '?'}</span></div><div class="tt-row"><span>Plays</span><span class="tt-val">{hovered.play_count || 0}</span></div><span class="tooltip-footer">Select to explore ↗</span></div>
 {/if}
 {#if galaxyStore.selectedNode}
  <aside class="stellar-detail" aria-label="Puzzle details"><button class="detail-close" aria-label="Close puzzle details" onclick={closeDetails}>×</button><GalaxyDetail /></aside>
 {:else if focusKey && scopedStars.length}
  <div class="constellation-story"><span class="eyebrow">CONNECTED BY TECHNIQUE</span><h2>{focusTitle}</h2><p>{technique ? 'These puzzles share a primary solving technique. Select one to see its difficulty and start playing.' : FAMILY_STORIES[focused!]}</p><span>{scopedStars.length} puzzles · select a star to begin</span></div>
 {/if}
 <div class="sky-bottom">
  <div class="map-caption"><span class="chart-cross" aria-hidden="true">+</span><div><strong>{scopedStars.length} puzzle stars</strong><span>Drag to explore <span class="desktop-hint">· scroll to zoom</span> · select a star</span></div></div>
  <div class="camera-controls"><button aria-label="Zoom out" onclick={() => zoomBy(.75)} disabled={!scopedStars.length}>−</button><button class="fit-view" onclick={() => flyTo(true)} disabled={!scopedStars.length}>Fit view</button><button aria-label="Zoom in" onclick={() => zoomBy(1.333)} disabled={!scopedStars.length}>+</button></div>
 </div>
</div>

<style>
 .galaxy-main { position: relative; isolation: isolate; height: clamp(580px, 73dvh, 850px); overflow: hidden; border: 1px solid #a9bbd021; border-radius: 20px; color: #e6edf7; background: #060a12; --ink: #e6edf7; --paper: #080d15; --paper2: #111b2a; --muted: #9daac0; --faint: #7f8fa7; --border: #9aaeca33; --grid-strong: #9aaeca28; --surface: #111c2bee; --surface-hover: #203044; --accent: #c9d9ed; --focus: #d0e5ff; }
 .sky-toolbar, .sky-bottom { position: absolute; z-index: 3; left: 28px; right: 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; pointer-events: none; }
 .sky-toolbar { top: 24px; } .sky-bottom { bottom: 24px; }
 .sky-toolbar button, .sky-bottom button { pointer-events: auto; }
 .sky-location { display: flex; align-items: center; gap: 13px; }
 .status-light { width: 5px; height: 5px; border-radius: 50%; background: #c9def5; box-shadow: 0 0 13px #90b4e4; }
 .sky-location strong { display: block; margin-top: 6px; font-size: 13px; font-weight: 400; }
 .eyebrow { color: #a5b5cc; font: 9px var(--mono); letter-spacing: .15em; }
 .sky-controls { display: flex; gap: 8px; }
 .sky-controls button, .camera-controls button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 9px 13px; border: 1px solid #a9bbd02c; border-radius: 8px; color: #d0dcec; background: #0a121dd4; backdrop-filter: blur(12px); font: 11px var(--sans); transition: background 160ms, border-color 160ms; }
 .sky-controls button:hover, .camera-controls button:hover { background: #24364be6; border-color: #b7cbea66; }
 .line-toggle[aria-pressed='false'] { color: #9daac0; }
 .camera-controls { display: flex; pointer-events: auto; }
 .fit-view { white-space: nowrap; }
 .camera-controls button { border-radius: 0; min-width: 40px; }
 .camera-controls button + button { border-left: 0; }
 .camera-controls button:first-child { border-radius: 8px 0 0 8px; font-size: 20px; }
 .camera-controls button:last-child { border-radius: 0 8px 8px 0; font-size: 20px; }
 .sky-viewport { position: absolute; inset: 0; }
 #galaxy-svg { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
 #galaxy-svg:active { cursor: grabbing; }
 .sky-entrance { animation: sky-arrival 1.5s ease both; }
 .galaxy-edge { stroke: #91aecf; stroke-width: .6; opacity: .10; vector-effect: non-scaling-stroke; pointer-events: none; transition: opacity 500ms, stroke 500ms; }
 .constellation-edge { opacity: .44; stroke-width: .9; stroke: #c0d0e5; animation: trace-constellation 2.4s ease both; }
 .galaxy-edge.related { opacity: .9; stroke: #e9f3ff; stroke-width: 1.15; }
 .galaxy-edge.muted { opacity: .055; }
 .galaxy-edge.out-of-scope { opacity: 0; }
 .lines-hidden .galaxy-edge { opacity: 0; }
 .star { transition: opacity 550ms; }
 .star.out-of-scope { opacity: .045; pointer-events: none; }
 .star.star-muted:not(.out-of-scope) { opacity: .27; }
 .selection-ring { fill: none; stroke: #d2e6ff; stroke-width: .7; stroke-dasharray: 2 4; opacity: 0; pointer-events: none; }
 .star-selected .selection-ring, .star:has(.galaxy-node:focus-visible) .selection-ring { opacity: 1; }
 .galaxy-node { fill: transparent; stroke: transparent; cursor: pointer; }
 .galaxy-node:focus-visible { outline: none; stroke: #e9f5ff; stroke-width: 1.4; stroke-dasharray: none; }
 .constellation-label { cursor: pointer; opacity: .78; transition: opacity 200ms; }
 .constellation-labels { opacity: var(--label-opacity, 1); }
 #galaxy-svg:global(.distant-view) .constellation-labels { pointer-events: none; }
 .constellation-label:hover { opacity: 1; }
 .label-content { transform: scale(var(--label-scale, 1)); }
 .family-label { font: 400 12px var(--sans); letter-spacing: .05em; fill: #cfdded; paint-order: stroke; stroke: #060a12a6; stroke-width: 4px; }
 .family-count { font: 8px var(--mono); paint-order: stroke; stroke: #060a12; stroke-width: 3px; letter-spacing: .15em; fill: #92a6c0; }
 .zoom-back-btn { position: absolute; top: 91px; left: 28px; z-index: 3; min-height: 40px; border: 0; border-bottom: 1px solid #a9bbd033; padding: 8px 0; background: transparent; color: #c2d3e8; font-size: 11px; }
 .map-caption { display: flex; align-items: center; gap: 14px; }
 .chart-cross { font: 300 32px var(--sans); color: #acbdd6; }
 .map-caption strong { display: block; font: 10px var(--mono); color: #c3d1e3; }
 .map-caption div > span { display: block; margin-top: 6px; font-size: 10px; color: #94a4bc; }
 .map-state { position: absolute; inset: 100px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; z-index: 2; pointer-events: none; }
 .map-state strong { font: 400 28px var(--serif); max-width: 30ch; }
 .map-state p { margin: 0; color: #aab9ce; font-size: 13px; line-height: 1.7; max-width: 42ch; }
 .loading-star { color: #d1e4ff; font-size: 38px; filter: drop-shadow(0 0 14px #9ec6fa); animation: star-breathe 2s ease-in-out infinite alternate; }
 .sky-action { pointer-events: auto; margin-top: 10px; border: 1px solid #a9bbd04a; border-radius: 8px; padding: 13px 20px; color: #e6edf7; background: #162335; font-size: 13px; }
 .galaxy-tooltip { position: absolute; z-index: 5; pointer-events: none; width: 216px; padding: 18px; border: 1px solid #acbfd333; border-radius: 12px; background: #0a1321ed; box-shadow: 0 16px 40px #0008; backdrop-filter: blur(18px); animation: tooltip-in 180ms ease; }
 .tooltip-kicker { display: block; color: #a8bbd3; font: 8px var(--mono); letter-spacing: .06em; margin-bottom: 12px; }
 .tt-hash { display: block; margin-bottom: 14px; font: 13px var(--mono); overflow-wrap: anywhere; }
 .tt-row { display: flex; justify-content: space-between; color: #97aac3; font-size: 11px; line-height: 1.9; }
 .tt-val { color: #dbe7f8; font-family: var(--mono); }
 .tooltip-footer { display: block; font-size: 10px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #a9bbd026; }
 .stellar-detail { position: absolute; z-index: 4; top: 88px; right: 24px; width: 276px; max-height: calc(100% - 174px); overflow-y: auto; padding: 22px; background: #0c1625f0; backdrop-filter: blur(24px); border: 1px solid #acbfd333; border-radius: 16px; box-shadow: 0 20px 60px #0006; animation: detail-in 320ms cubic-bezier(.2,.8,.2,1); }
 .detail-close { position: absolute; top: 3px; right: 3px; width: 44px; height: 44px; border: 0; border-radius: 8px; background: transparent; color: #b9cbe2; font-size: 24px; }
 .detail-close:hover { background: #fff1; }
 .stellar-detail :global(h2) { font: 10px var(--mono); text-transform: uppercase; letter-spacing: .08em; color: #aebed2; margin-bottom: 22px; }
 .stellar-detail :global(.detail-panel) { padding: 0; border: 0; background: transparent; }
 .stellar-detail :global(.detail-play-btn) { background: #d9e5f4; border-color: #d9e5f4; color: #111c2b; }
 .constellation-story { position: absolute; pointer-events: none; left: 28px; bottom: 108px; width: 230px; padding: 20px; border-left: 1px solid #99b6db33; background: linear-gradient(90deg,#070d17d9,transparent); animation: detail-in 500ms ease; }
 .constellation-story h2 { font: 400 30px var(--serif); margin: 12px 0; }
 .constellation-story p { font-size: 12px; color: #aabbd1; line-height: 1.8; }
 .constellation-story > span:last-child { color: #b9cbe1; font: 9px var(--mono); }
 .motion-paused { --celestial-motion: paused; }
 .motion-paused .loading-star { animation-play-state: paused; }
 .intro-complete .sky-entrance, .intro-complete .constellation-edge { animation: none; }
 :global([data-theme='high-contrast']) .galaxy-edge { stroke: #fff; opacity: .65; }
 :global([data-theme='high-contrast']) .galaxy-edge.out-of-scope, :global([data-theme='high-contrast']) .lines-hidden .galaxy-edge { opacity: 0; }
 :global([data-theme='high-contrast']) .family-count, :global([data-theme='high-contrast']) .map-caption div > span { fill: #fff; color: #fff; }
 @keyframes sky-arrival { from { opacity: 0; } to { opacity: 1; } }
 @keyframes trace-constellation { from { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
 @keyframes star-breathe { from { opacity: .4; } to { opacity: 1; } }
 @keyframes tooltip-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
 @keyframes detail-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
 @media (max-width: 760px) {
  .galaxy-node { r: calc(22px * var(--label-scale, 1)); }
  .galaxy-main { height: 650px; border-radius: 14px; }
  .sky-toolbar, .sky-bottom { left: 16px; right: 16px; gap: 10px; }
  .sky-toolbar { top: 18px; } .sky-bottom { bottom: 18px; }
  .sky-location { gap: 8px; } .sky-location strong { font-size: 12px; }
  .sky-controls { gap: 5px; } .sky-controls button { padding: 10px; min-height: 44px; }
  .motion-toggle span { display: none; }
  .eyebrow { font-size: 8px; }
  .map-caption { gap: 8px; } .chart-cross, .desktop-hint { display: none !important; }
  .map-caption div > span { max-width: 150px; line-height: 1.5; }
  .camera-controls { flex-shrink: 0; }
  .camera-controls button { min-width: 44px; padding: 9px; min-height: 44px; }
  .zoom-back-btn { left: 16px; top: 76px; }
  .stellar-detail { top: auto; bottom: 80px; right: 12px; left: 12px; width: auto; max-height: 330px; padding: 22px; }
  .constellation-story { left: 16px; right: 16px; bottom: 84px; width: auto; padding: 10px 12px; background: #0a121dc9; border: 1px solid #99b6db26; border-radius: 8px; }
  .constellation-story h2, .constellation-story > span { display: none; }
  .constellation-story p { font-size: 11px; margin: 0; line-height: 1.6; }
 }
 @media (prefers-reduced-motion: reduce) { *, .sky-entrance, .constellation-edge { animation: none !important; transition: none !important; } }
</style>
