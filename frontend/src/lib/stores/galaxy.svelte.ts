import { apiClient, type GalaxyNode, type GalaxyEdge, type GalaxyOverview, type GalaxyStats } from '$lib/api/client';

export const TECHNIQUE_FAMILIES: Record<string, { label: string; color: string; techniques: Record<string, string> }> = {
	singles: {
		label: 'Singles',
		color: '#22c55e',
		techniques: { HiddenSingle: '#86efac', NakedSingle: '#22c55e' }
	},
	pairs_triples: {
		label: 'Pairs & Triples',
		color: '#10b981',
		techniques: { NakedPair: '#a7f3d0', HiddenPair: '#6ee7b7', NakedTriple: '#34d399', HiddenTriple: '#10b981', NakedQuad: '#059669', HiddenQuad: '#047857' }
	},
	intersections: {
		label: 'Intersections',
		color: '#f59e0b',
		techniques: { PointingPair: '#fde68a', BoxLineReduction: '#f59e0b' }
	},
	fish: {
		label: 'Fish',
		color: '#0284c7',
		techniques: { XWing: '#bae6fd', Swordfish: '#7dd3fc', Jellyfish: '#38bdf8', FinnedXWing: '#0ea5e9', FinnedSwordfish: '#0284c7', FinnedJellyfish: '#0369a1', SiameseFish: '#075985', FrankenFish: '#0c4a6e', MutantFish: '#164e63', KrakenFish: '#155e75' }
	},
	wings: {
		label: 'Wings',
		color: '#a855f7',
		techniques: { XYWing: '#e9d5ff', XYZWing: '#d8b4fe', WXYZWing: '#c084fc', WWing: '#7c3aed' }
	},
	chains: {
		label: 'Chains',
		color: '#4f46e5',
		techniques: { XChain: '#c7d2fe', ThreeDMedusa: '#818cf8', AIC: '#4f46e5' }
	},
	rectangles: {
		label: 'Rectangles',
		color: '#f97316',
		techniques: { EmptyRectangle: '#fed7aa', UniqueRectangleType1: '#fdba74', UniqueRectangleType2: '#fb923c', UniqueRectangleType3: '#f97316', UniqueRectangleType4: '#ea580c', HiddenRectangle: '#c2410c', UniqueRectangleType5: '#9a3412', UniqueRectangleType6: '#7c2d12', ExtendedUniqueRectangle: '#ea580c' }
	},
	als: {
		label: 'ALS',
		color: '#db2777',
		techniques: { AlsXz: '#f9a8d4', AlsXyWing: '#f472b6', AlsChain: '#db2777' }
	},
	forcing: {
		label: 'Forcing',
		color: '#e11d48',
		techniques: { NishioForcingChain: '#fda4af', BowmanBingo: '#fb7185', ForcingChain: '#f43f5e', DynamicForcingChain: '#e11d48' }
	},
	other: {
		label: 'Other',
		color: '#64748b',
		techniques: { SueDeCoq: '#cbd5e1', AlignedPairExclusion: '#94a3b8', DeathBlossom: '#64748b', BUG: '#475569', Backtracking: '#1e293b' }
	}
};

export const SECRET_FAMILIES = new Set(['chains', 'als', 'forcing', 'other']);

export const DIFFICULTY_COLORS: Record<string, string> = {
	Beginner: '#86efac',
	Easy: '#22c55e',
	Medium: '#f59e0b',
	Intermediate: '#fb923c',
	Hard: '#ef4444',
	Expert: '#dc2626',
	Master: '#9333ea',
	Extreme: '#1e293b'
};

// Map difficulty tiers to technique families as a last-resort fallback
const DIFFICULTY_TO_FAMILY: Record<string, string> = {
	Beginner: 'singles',
	Easy: 'singles',
	Medium: 'pairs_triples',
	Intermediate: 'intersections',
	Hard: 'fish',
	Expert: 'wings',
	Master: 'chains',
	Extreme: 'forcing'
};

function techniqueToFamily(technique: string): string | null {
	// Try exact match first, then normalized (strip spaces) for API names like "Naked Single"
	const normalized = technique.replace(/\s+/g, '');
	for (const [familyKey, family] of Object.entries(TECHNIQUE_FAMILIES)) {
		if (technique in family.techniques || normalized in family.techniques) return familyKey;
	}
	return null;
}

export function nodePrimaryFamily(d: GalaxyNode): string {
	// 1. Use techniques array if available (last = hardest)
	if (d.techniques && d.techniques.length > 0) {
		const hardest = d.techniques[d.techniques.length - 1];
		const family = techniqueToFamily(hardest);
		if (family) return family;
	}
	// 2. Fall back to max_technique
	if (d.max_technique) {
		const family = techniqueToFamily(d.max_technique);
		if (family) return family;
	}
	// 3. Fall back to difficulty tier
	return DIFFICULTY_TO_FAMILY[d.difficulty] || 'singles';
}

// Generate edges client-side when the API returns none.
// Connects nodes that share a difficulty or have similar SE ratings.
export function synthesizeEdges(nodes: GalaxyNode[]): GalaxyEdge[] {
	if (nodes.length < 2) return [];
	const edges: GalaxyEdge[] = [];
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const a = nodes[i];
			const b = nodes[j];
			let similarity = 0;

			// Same difficulty → strong link
			if (a.difficulty === b.difficulty) similarity += 0.5;

			// Close SE rating → partial link
			const ratingA = a.se_rating || 0;
			const ratingB = b.se_rating || 0;
			if (ratingA > 0 && ratingB > 0) {
				const diff = Math.abs(ratingA - ratingB);
				if (diff < 1.0) similarity += 0.3;
				else if (diff < 3.0) similarity += 0.15;
			}

			// Same family → partial link
			if (nodePrimaryFamily(a) === nodePrimaryFamily(b)) similarity += 0.2;

			if (similarity >= 0.3) {
				edges.push({ source: a.id, target: b.id, similarity: Math.min(similarity, 1.0) });
			}
		}
	}
	return edges;
}

export function nodeColor(d: GalaxyNode): string {
	return DIFFICULTY_COLORS[d.difficulty] || '#64748b';
}

export function nodeRadius(d: GalaxyNode): number {
	const r = Math.sqrt(d.play_count || 1) * 3;
	return Math.max(4, Math.min(20, r));
}

class GalaxyStore {
	nodes = $state<GalaxyNode[]>([]);
	edges = $state<GalaxyEdge[]>([]);
	stats = $state<GalaxyStats | null>(null);
	activeFilters = $state<Set<string>>(new Set());
	selectedNode = $state<GalaxyNode | null>(null);
	loading = $state(true);
	ws: WebSocket | null = null;

	constructor() {
		// Initialize active filters with non-secret families
		const initial = new Set<string>();
		for (const key of Object.keys(TECHNIQUE_FAMILIES)) {
			if (!SECRET_FAMILIES.has(key)) initial.add(key);
		}
		this.activeFilters = initial;
	}

	initWithSecrets(secretsUnlocked: boolean) {
		if (secretsUnlocked) {
			const all = new Set(Object.keys(TECHNIQUE_FAMILIES));
			this.activeFilters = all;
		}
	}

	async fetchData() {
		this.loading = true;
		const [overview, stats] = await Promise.all([
			apiClient.fetchGalaxyOverview(),
			apiClient.fetchGalaxyStats()
		]);

		if (overview && overview.nodes.length > 0) {
			this.nodes = overview.nodes;
			// Use API edges if available, otherwise synthesize from node attributes
			this.edges = overview.edges.length > 0
				? overview.edges
				: synthesizeEdges(overview.nodes);
		}
		if (stats) {
			this.stats = stats;
		}
		this.loading = false;
	}

	toggleFilter(familyKey: string) {
		const next = new Set(this.activeFilters);
		if (next.has(familyKey)) {
			next.delete(familyKey);
		} else {
			next.add(familyKey);
		}
		this.activeFilters = next;
	}

	selectNode(node: GalaxyNode | null) {
		this.selectedNode = node;
	}

	isNodeVisible(d: GalaxyNode): boolean {
		return this.activeFilters.has(nodePrimaryFamily(d));
	}

	addLiveNode(data: GalaxyNode, newEdges?: GalaxyEdge[]) {
		this.nodes = [...this.nodes, data];
		if (newEdges) {
			this.edges = [...this.edges, ...newEdges];
		}
	}

	updateNodePlayCount(puzzleHash: string, playCount: number) {
		const idx = this.nodes.findIndex((n) => n.id === puzzleHash || n.puzzle_hash === puzzleHash);
		if (idx >= 0) {
			const updated = [...this.nodes];
			updated[idx] = { ...updated[idx], play_count: playCount };
			this.nodes = updated;
		}
	}

	connectWebSocket() {
		if (typeof window === 'undefined') return;

		const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${location.host}/api/v1/ws/galaxy`;

		try {
			this.ws = new WebSocket(wsUrl);

			this.ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.type === 'new_puzzle' && msg.data) {
						const newNode: GalaxyNode = {
							id: msg.data.puzzle_hash || msg.data.id,
							puzzle_hash: msg.data.puzzle_hash,
							short_code: msg.data.short_code,
							puzzle_string: msg.data.puzzle_string,
							difficulty: msg.data.difficulty,
							se_rating: msg.data.se_rating,
							play_count: msg.data.play_count || 1,
							max_technique: msg.data.max_technique || null,
							techniques: msg.data.techniques || [],
							avg_time_secs: msg.data.avg_time_secs
						};
						this.addLiveNode(newNode, msg.data.edges);
					} else if (msg.type === 'play_result' && msg.data) {
						this.updateNodePlayCount(
							msg.data.puzzle_hash,
							msg.data.play_count || 0
						);
					}
				} catch { /* ignore malformed */ }
			};

			this.ws.onclose = () => {
				setTimeout(() => this.connectWebSocket(), 5000);
			};

			this.ws.onerror = () => {
				this.ws?.close();
			};
		} catch { /* WebSocket not available */ }
	}

	disconnectWebSocket() {
		if (this.ws) {
			this.ws.onclose = null;
			this.ws.close();
			this.ws = null;
		}
	}
}

export const galaxyStore = new GalaxyStore();
