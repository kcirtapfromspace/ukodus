<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import {
		galaxyStore,
		TECHNIQUE_FAMILIES,
		nodeColor,
		nodeRadius,
		nodePrimaryFamily,
		nodePrimaryTechnique,
		computeFamilyCentroids
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
	let labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
	let familyCentroids: Record<string, { x: number; y: number }> = {};
	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

	function computeHull(points: [number, number][]): [number, number][] | null {
		if (points.length < 3) return null;
		const hull = d3.polygonHull(points);
		if (!hull) return null;
		const centroid = d3.polygonCentroid(hull);
		return hull.map(([x, y]) => {
			const dx = x - centroid[0];
			const dy = y - centroid[1];
			const dist = Math.sqrt(dx * dx + dy * dy);
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

	function computeTechniqueCentroids(
		familyKey: string,
		nodes: GalaxyNode[],
		cx: number,
		cy: number
	): Record<string, { x: number; y: number }> {
		const family = TECHNIQUE_FAMILIES[familyKey];
		if (!family) return {};
		const techNodes: Record<string, number> = {};
		for (const n of nodes) {
			const tech = nodePrimaryTechnique(n);
			if (tech in family.techniques) {
				techNodes[tech] = (techNodes[tech] || 0) + 1;
			}
		}
		const techNames = Object.keys(techNodes);
		if (techNames.length === 0) return {};
		const radius = 120;
		const result: Record<string, { x: number; y: number }> = {};
		techNames.forEach((name, i) => {
			const angle = (2 * Math.PI * i) / techNames.length - Math.PI / 2;
			result[name] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
		});
		return result;
	}

	function zoomToFamily(familyKey: string) {
		if (!simulation) return;

		const familyNodes = galaxyStore.nodes.filter((n) => nodePrimaryFamily(n) === familyKey);
		if (familyNodes.length === 0) return;

		// Compute bounding box with padding
		const pad = 80;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const n of familyNodes) {
			const x = n.x || 0, y = n.y || 0;
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
		minX -= pad; minY -= pad; maxX += pad; maxY += pad;

		const { width, height } = svgEl.getBoundingClientRect();
		const bw = maxX - minX, bh = maxY - minY;
		const scale = Math.min(4, Math.min(width / bw, height / bh) * 0.9);
		const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
		const tx = width / 2 - cx * scale, ty = height / 2 - cy * scale;

		// Animate zoom
		const svg = d3.select(svgEl);
		svg.transition().duration(750).call(
			zoomBehavior.transform,
			d3.zoomIdentity.translate(tx, ty).scale(scale)
		);

		// Compute technique-level centroids for the focused family
		const familyCentroid = familyCentroids[familyKey] || { x: cx, y: cy };
		const techCentroids = computeTechniqueCentroids(
			familyKey, familyNodes, familyCentroid.x, familyCentroid.y
		);

		// Update forces: technique-level targets for focused family, push others away
		simulation.force('familyX', d3.forceX<GalaxyNode>((d) => {
			const fam = nodePrimaryFamily(d);
			if (fam === familyKey) {
				const tech = nodePrimaryTechnique(d);
				return techCentroids[tech]?.x ?? familyCentroid.x;
			}
			return familyCentroids[fam]?.x ?? width / 2;
		}).strength((d) => nodePrimaryFamily(d) === familyKey ? 0.2 : 0));

		simulation.force('familyY', d3.forceY<GalaxyNode>((d) => {
			const fam = nodePrimaryFamily(d);
			if (fam === familyKey) {
				const tech = nodePrimaryTechnique(d);
				return techCentroids[tech]?.y ?? familyCentroid.y;
			}
			return familyCentroids[fam]?.y ?? height / 2;
		}).strength((d) => nodePrimaryFamily(d) === familyKey ? 0.2 : 0));

		// Reduce charge for non-focused
		simulation.force('charge', d3.forceManyBody<GalaxyNode>().strength((d) =>
			nodePrimaryFamily(d) === familyKey ? -40 : -10
		));

		// Dim non-focused nodes
		d3.select(svgEl)
			.selectAll<SVGCircleElement, GalaxyNode>('.galaxy-node')
			.classed('dimmed-family', (d) => nodePrimaryFamily(d) !== familyKey);

		simulation.alpha(0.5).restart();
	}

	function zoomOut() {
		if (!simulation) return;

		const { width, height } = svgEl.getBoundingClientRect();
		familyCentroids = computeFamilyCentroids(width, height);

		// Restore family-level forces
		simulation.force('familyX', d3.forceX<GalaxyNode>((d) => {
			return familyCentroids[nodePrimaryFamily(d)]?.x ?? width / 2;
		}).strength(0.15));

		simulation.force('familyY', d3.forceY<GalaxyNode>((d) => {
			return familyCentroids[nodePrimaryFamily(d)]?.y ?? height / 2;
		}).strength(0.15));

		// Restore charge
		simulation.force('charge', d3.forceManyBody().strength(-80));

		// Animate zoom back to identity
		const svg = d3.select(svgEl);
		svg.transition().duration(750).call(
			zoomBehavior.transform,
			d3.zoomIdentity
		);

		// Remove dimming
		svg.selectAll('.galaxy-node').classed('dimmed-family', false);

		// Remove technique hulls and labels
		hullGroup.selectAll('.technique-hull').remove();
		labelGroup?.selectAll('.technique-label').remove();

		simulation.alpha(0.5).restart();
		applyFilters();
	}

	function updateHulls() {
		const familyPoints: Record<string, [number, number][]> = {};
		for (const fk of Object.keys(TECHNIQUE_FAMILIES)) familyPoints[fk] = [];

		for (const node of galaxyStore.nodes) {
			const family = nodePrimaryFamily(node);
			if (family && familyPoints[family]) {
				familyPoints[family].push([node.x || 0, node.y || 0]);
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

		const hullEnter = hullSel
			.enter()
			.append('path')
			.attr('class', 'cluster-hull')
			.style('cursor', 'pointer')
			.on('click', (event, d) => {
				event.stopPropagation();
				galaxyStore.focusFamily(d.family);
			})
			.on('mouseenter', function () {
				d3.select(this).attr('fill-opacity', 0.12);
			})
			.on('mouseleave', function () {
				d3.select(this).attr('fill-opacity', 0.06);
			});

		hullEnter
			.merge(hullSel)
			.attr('d', (d) => `M${d.path.join('L')}Z`)
			.attr('fill', (d) => d.color)
			.attr('stroke', (d) => d.color)
			.attr('fill-opacity', 0.06)
			.attr('stroke-opacity', 0.15)
			.attr('stroke-width', 1.5);

		// Family labels (overview mode)
		if (labelGroup) {
			labelGroup.selectAll('.family-label').remove();

			if (!galaxyStore.focusedFamily) {
				for (const [fk, points] of Object.entries(familyPoints)) {
					if (points.length === 0) continue;
					const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
					const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
					labelGroup
						.append('text')
						.attr('class', 'family-label')
						.attr('x', cx)
						.attr('y', cy)
						.attr('text-anchor', 'middle')
						.attr('dominant-baseline', 'central')
						.attr('fill', TECHNIQUE_FAMILIES[fk].color)
						.attr('opacity', 0.5)
						.attr('font-size', '11px')
						.attr('font-family', 'var(--mono)')
						.text(TECHNIQUE_FAMILIES[fk].label);
				}
			}

			// Technique sub-hulls + labels (zoomed mode)
			hullGroup.selectAll('.technique-hull').remove();
			labelGroup.selectAll('.technique-label').remove();

			if (galaxyStore.focusedFamily) {
				const fk = galaxyStore.focusedFamily;
				const family = TECHNIQUE_FAMILIES[fk];
				if (family) {
					const techPoints: Record<string, [number, number][]> = {};
					for (const node of galaxyStore.nodes) {
						if (nodePrimaryFamily(node) !== fk) continue;
						const tech = nodePrimaryTechnique(node);
						if (!techPoints[tech]) techPoints[tech] = [];
						techPoints[tech].push([node.x || 0, node.y || 0]);
					}

					for (const [tech, points] of Object.entries(techPoints)) {
						const techColor = family.techniques[tech] || family.color;

						// Sub-hull (only if 3+ nodes)
						if (points.length >= 3) {
							const hull = computeHull(points);
							if (hull) {
								hullGroup
									.append('path')
									.attr('class', 'technique-hull')
									.attr('d', `M${hull.join('L')}Z`)
									.attr('fill', techColor)
									.attr('stroke', techColor)
									.attr('fill-opacity', 0.08)
									.attr('stroke-opacity', 0.25)
									.attr('stroke-width', 1);
							}
						}

						// Technique label
						const tcx = points.reduce((s, p) => s + p[0], 0) / points.length;
						const tcy = points.reduce((s, p) => s + p[1], 0) / points.length;
						labelGroup
							.append('text')
							.attr('class', 'technique-label')
							.attr('x', tcx)
							.attr('y', tcy)
							.attr('text-anchor', 'middle')
							.attr('dominant-baseline', 'central')
							.attr('fill', techColor)
							.attr('opacity', 0.7)
							.attr('font-size', '10px')
							.attr('font-weight', 'bold')
							.attr('font-family', 'var(--mono)')
							.text(tech);
					}
				}
			}
		}
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

		d3.select(svgEl).on('click', () => {
			if (galaxyStore.focusedFamily) galaxyStore.focusFamily(null);
			else galaxyStore.selectNode(null);
		});

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

		zoomBehavior = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 8])
			.on('zoom', (event) => g.attr('transform', event.transform));

		svg.call(zoomBehavior);

		g = svg.append('g');
		hullGroup = g.append('g').attr('class', 'hulls');
		edgeGroup = g.append('g').attr('class', 'edges');
		nodeGroup = g.append('g').attr('class', 'nodes');
		labelGroup = g.append('g').attr('class', 'labels');

		if (galaxyStore.nodes.length > 0) {
			familyCentroids = computeFamilyCentroids(width, height);

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
				.force('familyX', d3.forceX<GalaxyNode>((d) => {
					return familyCentroids[nodePrimaryFamily(d)]?.x ?? width / 2;
				}).strength(0.15))
				.force('familyY', d3.forceY<GalaxyNode>((d) => {
					return familyCentroids[nodePrimaryFamily(d)]?.y ?? height / 2;
				}).strength(0.15))
				.force('collide', d3.forceCollide<GalaxyNode>().radius((d) => nodeRadius(d) + 2))
				.alphaDecay(0.02)
				.on('tick', ticked);

			renderGraph();
			galaxyStore.connectWebSocket();
		}

		// Resize handler
		let resizeTimer: ReturnType<typeof setTimeout>;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				if (simulation) {
					const { width: w, height: h } = svgEl.getBoundingClientRect();
					if (!galaxyStore.focusedFamily) {
						familyCentroids = computeFamilyCentroids(w, h);
						simulation.force('familyX', d3.forceX<GalaxyNode>((d) => {
							return familyCentroids[nodePrimaryFamily(d)]?.x ?? w / 2;
						}).strength(0.15));
						simulation.force('familyY', d3.forceY<GalaxyNode>((d) => {
							return familyCentroids[nodePrimaryFamily(d)]?.y ?? h / 2;
						}).strength(0.15));
					}
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

	// React to focus changes — drive zoom transitions
	let prevFocused: string | null | undefined = undefined;
	$effect(() => {
		const focused = galaxyStore.focusedFamily;
		if (focused === prevFocused) return;
		const wasInit = prevFocused === undefined;
		prevFocused = focused;
		if (wasInit || !simulation || !nodeGroup) return;

		if (focused) {
			zoomToFamily(focused);
		} else {
			zoomOut();
		}
		applyFilters();
		updateHulls();
	});

	onDestroy(() => {
		simulation?.stop();
		galaxyStore.disconnectWebSocket();
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
	{#if galaxyStore.focusedFamily}
		<button class="zoom-back-btn" onclick={() => galaxyStore.focusFamily(null)}>&larr; Back to Galaxy</button>
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

	:global(.dimmed-family) {
		opacity: 0.08;
		pointer-events: none;
	}

	:global(.technique-hull) {
		pointer-events: none;
	}

	:global(.family-label),
	:global(.technique-label) {
		pointer-events: none;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.zoom-back-btn {
		position: absolute;
		top: 12px;
		left: 32px;
		z-index: 10;
		font-family: var(--mono);
		font-size: 12px;
		padding: 6px 14px;
		border-radius: 20px;
		border: 1px solid rgba(20, 20, 20, 0.15);
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(8px);
		cursor: pointer;
		color: var(--ink);
		transition: background 140ms ease, border-color 140ms ease;
	}

	.zoom-back-btn:hover {
		background: rgba(255, 255, 255, 0.9);
		border-color: rgba(20, 20, 20, 0.3);
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
