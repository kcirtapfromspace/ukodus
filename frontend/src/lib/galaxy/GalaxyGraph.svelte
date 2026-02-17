<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import {
		galaxyStore,
		TECHNIQUE_FAMILIES,
		nodeColor,
		nodeRadius,
		nodePrimaryFamily
	} from '$lib/stores/galaxy.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import type { GalaxyNode, GalaxyEdge } from '$lib/api/types';

	let svgEl: SVGSVGElement;
	let tooltipEl: HTMLDivElement;
	let simulation: d3.Simulation<GalaxyNode, GalaxyEdge> | null = null;

	let g: d3.Selection<SVGGElement, unknown, null, undefined>;
	let hullGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let edgeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

	function computeHull(points: [number, number][]): [number, number][] | null {
		if (points.length < 3) return null;
		const hull = d3.polygonHull(points);
		if (!hull) return null;
		const centroid = d3.polygonCentroid(hull);
		return hull.map(([x, y]) => {
			const dx = x - centroid[0];
			const dy = y - centroid[1];
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist === 0) return [x, y] as [number, number];
			const pad = 20;
			return [x + (dx / dist) * pad, y + (dy / dist) * pad] as [number, number];
		});
	}

	function showTooltip(event: MouseEvent, d: GalaxyNode) {
		while (tooltipEl.firstChild) tooltipEl.removeChild(tooltipEl.firstChild);

		const hashDiv = document.createElement('div');
		hashDiv.className = 'tt-hash';
		hashDiv.textContent = d.short_code || d.puzzle_hash || '---';
		tooltipEl.appendChild(hashDiv);

		for (const [label, val] of [
			['Difficulty', d.difficulty || '?'],
			['SE Rating', d.se_rating != null ? d.se_rating.toFixed(1) : '?'],
			['Plays', String(d.play_count || 0)]
		]) {
			const row = document.createElement('div');
			row.className = 'tt-row';
			const labelSpan = document.createElement('span');
			labelSpan.textContent = label;
			const valSpan = document.createElement('span');
			valSpan.className = 'tt-val';
			valSpan.textContent = val;
			row.appendChild(labelSpan);
			row.appendChild(valSpan);
			tooltipEl.appendChild(row);
		}

		tooltipEl.classList.add('visible');
		positionTooltip(event);
	}

	function positionTooltip(event: MouseEvent) {
		const rect = svgEl.getBoundingClientRect();
		tooltipEl.style.left = `${event.clientX - rect.left + 12}px`;
		tooltipEl.style.top = `${event.clientY - rect.top - 10}px`;
	}

	function hideTooltip() {
		tooltipEl.classList.remove('visible');
	}

	function updateHulls() {
		const familyPoints: Record<string, [number, number][]> = {};
		for (const fk of Object.keys(TECHNIQUE_FAMILIES)) familyPoints[fk] = [];

		for (const node of galaxyStore.nodes) {
			const family = nodePrimaryFamily(node);
			const x = node.x;
			const y = node.y;
			if (family && familyPoints[family] && x != null && y != null && isFinite(x) && isFinite(y)) {
				familyPoints[family].push([x!, y!]);
			}
		}

		const hullData: { family: string; path: [number, number][]; color: string }[] = [];
		for (const [fk, points] of Object.entries(familyPoints)) {
			if (points.length < 3) continue;
			const hull = computeHull(points);
			if (hull) hullData.push({ family: fk, path: hull, color: TECHNIQUE_FAMILIES[fk].color });
		}

		const hullSel = hullGroup
			.selectAll<SVGPathElement, typeof hullData[number]>('path.cluster-hull')
			.data(hullData, (d) => d.family);

		hullSel.exit().remove();

		hullSel
			.enter()
			.append('path')
			.attr('class', 'cluster-hull')
			.merge(hullSel)
			.attr('d', (d) => `M${d.path.join('L')}Z`)
			.attr('fill', (d) => d.color)
			.attr('stroke', (d) => d.color)
			.attr('fill-opacity', 0.06)
			.attr('stroke-opacity', 0.15)
			.attr('stroke-width', 1.5);
	}

	function applyFilters() {
		const svg = d3.select(svgEl);
		svg
			.selectAll<SVGCircleElement, GalaxyNode>('.galaxy-node')
			.classed('dimmed', (d) => !galaxyStore.isNodeVisible(d));
		svg
			.selectAll<SVGLineElement, GalaxyEdge>('.galaxy-edge')
			.attr('stroke-opacity', (d: any) => {
				const srcVis = galaxyStore.isNodeVisible(d.source);
				const tgtVis = galaxyStore.isNodeVisible(d.target);
				if (!srcVis || !tgtVis) return 0.02;
				return d.similarity || 0.1;
			});

		hullGroup
			.selectAll<SVGPathElement, { family: string }>('.cluster-hull')
			.attr('display', (d) => (galaxyStore.activeFilters.has(d.family) ? null : 'none'));
	}

	function renderGraph() {
		const nodes = galaxyStore.nodes;
		const edges = galaxyStore.edges;

		// Edges
		const edgeSel = edgeGroup
			.selectAll<SVGLineElement, GalaxyEdge>('line')
			.data(edges, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`);
		edgeSel.exit().remove();
		edgeSel
			.enter()
			.append('line')
			.attr('class', 'galaxy-edge')
			.merge(edgeSel)
			.attr('stroke-opacity', (d) => d.similarity || 0.1);

		// Nodes
		const nodeSel = nodeGroup
			.selectAll<SVGCircleElement, GalaxyNode>('circle.galaxy-node')
			.data(nodes, (d) => d.id);
		nodeSel.exit().remove();
		nodeSel
			.enter()
			.append('circle')
			.attr('class', 'galaxy-node')
			.attr('r', (d) => nodeRadius(d))
			.attr('fill', (d) => nodeColor(d))
			.on('mouseover', (event, d) => showTooltip(event, d))
			.on('mousemove', (event) => positionTooltip(event))
			.on('mouseout', () => hideTooltip())
			.on('click', (event, d) => {
				event.stopPropagation();
				galaxyStore.selectNode(d);
				posthogStore.captureEvent('galaxy_node_clicked', { puzzle_hash: d.puzzle_hash });
			})
			.call(
				d3
					.drag<SVGCircleElement, GalaxyNode>()
					.on('start', (event, d) => {
						if (!event.active) simulation?.alphaTarget(0.3).restart();
						d.fx = d.x;
						d.fy = d.y;
					})
					.on('drag', (event, d) => {
						d.fx = event.x;
						d.fy = event.y;
					})
					.on('end', (event, d) => {
						if (!event.active) simulation?.alphaTarget(0);
						d.fx = null;
						d.fy = null;
					})
			)
			.merge(nodeSel)
			.attr('r', (d) => nodeRadius(d))
			.attr('fill', (d) => nodeColor(d));

		d3.select(svgEl).on('click', () => galaxyStore.selectNode(null));

		updateHulls();
		applyFilters();
	}

	function ticked() {
		edgeGroup
			.selectAll<SVGLineElement, any>('line')
			.attr('x1', (d) => d.source.x)
			.attr('y1', (d) => d.source.y)
			.attr('x2', (d) => d.target.x)
			.attr('y2', (d) => d.target.y);
		nodeGroup
			.selectAll<SVGCircleElement, GalaxyNode>('circle.galaxy-node')
			.attr('cx', (d) => d.x!)
			.attr('cy', (d) => d.y!);
		if (simulation && simulation.alpha() > 0.1) updateHulls();
	}

	onMount(async () => {
		await galaxyStore.fetchData();

		const svg = d3.select(svgEl);
		const { width, height } = svgEl.getBoundingClientRect();

		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 8])
			.on('zoom', (event) => g.attr('transform', event.transform));

		svg.call(zoom);

		g = svg.append('g');
		hullGroup = g.append('g').attr('class', 'hulls');
		edgeGroup = g.append('g').attr('class', 'edges');
		nodeGroup = g.append('g').attr('class', 'nodes');

		if (galaxyStore.nodes.length > 0) {
			simulation = d3
				.forceSimulation<GalaxyNode>(galaxyStore.nodes)
				.force(
					'link',
					d3
						.forceLink<GalaxyNode, GalaxyEdge>(galaxyStore.edges)
						.id((d) => d.id)
						.distance(60)
						.strength(0.3)
				)
				.force('charge', d3.forceManyBody().strength(-80))
				.force('center', d3.forceCenter(width / 2, height / 2))
				.force('collide', d3.forceCollide<GalaxyNode>().radius((d) => nodeRadius(d) + 2))
				.alphaDecay(0.02)
				.on('tick', ticked);

			renderGraph();
			// Delay SSE connection to let Cloudflare rate-limit window reset
			setTimeout(() => galaxyStore.connectLiveUpdates(), 15000);
		}

		// Resize handler
		let resizeTimer: ReturnType<typeof setTimeout>;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				if (simulation) {
					const { width: w, height: h } = svgEl.getBoundingClientRect();
					simulation.force('center', d3.forceCenter(w / 2, h / 2));
					simulation.alpha(0.1).restart();
				}
			}, 200);
		});
	});

	// React to filter changes
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		galaxyStore.activeFilters;
		if (nodeGroup) applyFilters();
	});

	onDestroy(() => {
		simulation?.stop();
		galaxyStore.disconnectLiveUpdates();
	});
</script>

<div class="galaxy-main">
	{#if galaxyStore.loading}
		<div class="galaxy-loading">Loading galaxy</div>
	{:else if galaxyStore.nodes.length === 0}
		<div class="galaxy-empty">
			<div class="empty-icon">*</div>
			<div>No puzzles in the galaxy yet.</div>
			<div>Play a puzzle to add the first star!</div>
			<a class="detail-play-btn" href="/play/" style="margin-top: 12px">Play Now</a>
		</div>
	{/if}
	<svg bind:this={svgEl} id="galaxy-svg"></svg>
	<div bind:this={tooltipEl} class="galaxy-tooltip"></div>
</div>

<style>
	.galaxy-main {
		position: relative;
		overflow: hidden;
		padding-left: 20px;
	}

	:global(#galaxy-svg) {
		width: 100%;
		height: calc(100vh - 120px);
		cursor: grab;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(20, 20, 20, 0.08);
		background: rgba(255, 255, 255, 0.30);
	}

	:global(#galaxy-svg:active) {
		cursor: grabbing;
	}

	.galaxy-tooltip {
		position: absolute;
		pointer-events: none;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(20, 20, 20, 0.12);
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(8px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		font-size: 12px;
		line-height: 1.5;
		z-index: 20;
		opacity: 0;
		transition: opacity 120ms ease;
		max-width: 240px;
	}

	:global(.galaxy-tooltip.visible) {
		opacity: 1;
	}

	.galaxy-tooltip :global(.tt-hash) {
		font-family: var(--mono);
		font-weight: 600;
		margin-bottom: 4px;
	}

	.galaxy-tooltip :global(.tt-row) {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		color: var(--muted);
	}

	.galaxy-tooltip :global(.tt-val) {
		font-family: var(--mono);
		color: var(--ink);
	}

	:global(.cluster-hull) {
		fill-opacity: 0.06;
		stroke-opacity: 0.15;
		stroke-width: 1.5;
	}

	:global(.galaxy-node) {
		cursor: pointer;
		transition: opacity 200ms ease;
	}

	:global(.galaxy-node:hover) {
		filter: brightness(1.15);
	}

	:global(.galaxy-node.dimmed) {
		opacity: 0.15;
	}

	:global(.galaxy-edge) {
		stroke: var(--faint);
		stroke-width: 0.5;
	}

	@keyframes galaxy-pulse {
		0% { r: var(--base-r); opacity: 1; }
		50% { r: calc(var(--base-r) * 2.5); opacity: 0; }
		100% { r: var(--base-r); opacity: 0; }
	}

	:global(.pulse-ring) {
		animation: galaxy-pulse 1.5s ease-out;
		fill: none;
		pointer-events: none;
	}

	.galaxy-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--faint);
		font-size: 14px;
		gap: 8px;
	}

	.galaxy-empty .empty-icon {
		font-size: 48px;
		opacity: 0.3;
	}

	.galaxy-loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-family: var(--mono);
		font-size: 13px;
		color: var(--faint);
	}

	.galaxy-loading::after {
		content: '';
		animation: loading-dots 1.5s infinite;
	}

	@keyframes loading-dots {
		0%, 20% { content: '.'; }
		40% { content: '..'; }
		60%, 100% { content: '...'; }
	}

	@media (max-width: 940px) {
		.galaxy-main { padding-left: 0; }
		:global(#galaxy-svg) { height: 60vh; min-height: 400px; }
	}

	@media (max-width: 640px) {
		:global(#galaxy-svg) { height: 50vh; min-height: 300px; }
	}
</style>
