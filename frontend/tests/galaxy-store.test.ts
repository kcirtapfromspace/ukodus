import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { GalaxyNode } from '../src/lib/api/types';
vi.mock('../src/lib/api/client', () => ({ apiClient: { fetchGalaxyOverview: vi.fn(), fetchGalaxyStats: vi.fn() } }));
class Socket {
 static instances: Socket[] = [];
 onmessage: ((event: { data: string }) => void) | null = null;
 onclose: (() => void) | null = null;
 onerror: (() => void) | null = null;
 close = vi.fn();
 constructor(public url: string) { Socket.instances.push(this); }
 send(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }); }
}
function node(overrides: Partial<GalaxyNode> = {}): GalaxyNode {
 return { id: 'n', puzzle_hash: 'hash', difficulty: 'Hard', se_rating: 4, play_count: 4, techniques: [], ...overrides };
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); Socket.instances = []; vi.stubGlobal('WebSocket', Socket); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('classifies techniques using their hardest technique, fallback technique, then difficulty', async () => {
 const { nodePrimaryFamily, nodePrimaryTechnique, nodeColor, nodeRadius, computeFamilyCentroids, TECHNIQUE_FAMILIES } = await import('../src/lib/stores/galaxy.svelte');
 expect(nodePrimaryFamily(node({ techniques: ['HiddenSingle', 'X Wing'] }))).toBe('fish');
 expect(nodePrimaryFamily(node({ techniques: ['NotKnown'], max_technique: 'XYWing' }))).toBe('wings');
 expect(nodePrimaryFamily(node({ max_technique: 'Unknown', difficulty: 'Extreme' }))).toBe('forcing');
 expect(nodePrimaryFamily(node({ max_technique: 'Arithmetic Counting', difficulty: 'Extreme' }))).toBe('other');
 expect(nodePrimaryFamily(node({ techniques: ['X-Wing'] }))).toBe('fish');
 expect(nodePrimaryFamily(node({ techniques: ['UniqueRectangleType3'] }))).toBe('rectangles');
 expect(nodePrimaryFamily(node({ techniques: ['BUG+1'] }))).toBe('other');
 expect(nodePrimaryFamily(node({ techniques: ['ALS-XZ'] }))).toBe('als');
 expect(nodePrimaryFamily(node({ techniques: ['Sue de Coq'] }))).toBe('other');
 expect(nodePrimaryFamily(node({ techniques: ['3D Medusa'] }))).toBe('chains');
 expect(nodePrimaryFamily(node({ techniques: ['BowmanBingo'] }))).toBe('forcing');
 expect(nodePrimaryFamily(node({ difficulty: 'Unknown' }))).toBe('singles');
 expect(nodePrimaryTechnique(node({ techniques: ['HiddenSingle', 'XWing'] }))).toBe('XWing');
 expect(nodePrimaryTechnique(node({ max_technique: 'HiddenSingle' }))).toBe('HiddenSingle');
 expect(nodePrimaryTechnique(node({ max_technique: 'Arithmetic Counting' }))).toBe('ArithmeticCounting');
 expect(nodePrimaryTechnique(node())).toBe('unknown');
 expect(nodeColor(node())).toBe('#ef4444'); expect(nodeColor(node({ difficulty: '?' }))).toBe('#64748b');
 expect([0, 4, 1000].map(play_count => nodeRadius(node({ play_count })))).toEqual([4, 6, 20]);
 const centers = computeFamilyCentroids(1000, 500);
 expect(Object.keys(centers)).toEqual(Object.keys(TECHNIQUE_FAMILIES));
 expect(Object.values(TECHNIQUE_FAMILIES).reduce((count, family) => count + Object.keys(family.techniques).length, 0)).toBe(46);
 expect(centers.singles).toEqual({ x: 500, y: 100 });
 for (const center of Object.values(centers)) expect(Math.hypot(center.x - 500, center.y - 250)).toBeCloseTo(150);
});

it('fetches the graph and statistics and exposes responsive filter/selection state', async () => {
 const { galaxyStore: store, SECRET_FAMILIES, TECHNIQUE_FAMILIES } = await import('../src/lib/stores/galaxy.svelte');
 const { apiClient } = await import('../src/lib/api/client');
 expect([...store.activeFilters].some(f => SECRET_FAMILIES.has(f))).toBe(false);
 store.initWithSecrets(false); store.toggleFilter('fish'); expect(store.isNodeVisible(node())).toBe(false);
 store.toggleFilter('fish'); expect(store.isNodeVisible(node())).toBe(true);
 store.initWithSecrets(true); expect(store.activeFilters.size).toBe(Object.keys(TECHNIQUE_FAMILIES).length);
 const nodes = [node(), node({ id: 'legacy', puzzle_hash: '' })], edges = [{ source: 'hash', target: 'legacy', similarity: 1 }];
 vi.mocked(apiClient.fetchGalaxyOverview).mockResolvedValue({ nodes, edges });
 vi.mocked(apiClient.fetchGalaxyStats).mockResolvedValue({ total_puzzles: 2, total_plays: 4 });
 await store.fetchData();
 expect(store.nodes.map(n => n.id)).toEqual(['hash', 'legacy']); expect(store.edges).toEqual(edges);
 expect(store.stats?.total_puzzles).toBe(2); expect(store.loading).toBe(false);
 store.selectNode(store.nodes[0]); store.focusFamily('fish');
 expect(store.selectedNode?.id).toBe('hash'); expect(store.focusedFamily).toBe('fish');
 store.selectNode(null); store.focusFamily(null);
 expect(store.selectedNode).toBeNull(); expect(store.focusedFamily).toBeNull();
 vi.mocked(apiClient.fetchGalaxyOverview).mockResolvedValue(null); vi.mocked(apiClient.fetchGalaxyStats).mockResolvedValue(null);
 await store.fetchData(); expect(store.nodes).toHaveLength(2); expect(store.stats?.total_plays).toBe(4);
 vi.mocked(apiClient.fetchGalaxyOverview).mockResolvedValue({ nodes: [], edges: [] }); await store.fetchData();
 expect(store.nodes).toHaveLength(2);
});

it('handles live additions, updates, malformed messages and disconnect cleanup', async () => {
 const { galaxyStore: store } = await import('../src/lib/stores/galaxy.svelte');
 store.connectWebSocket(); const ws = Socket.instances[0]; expect(ws.url).toMatch(/^ws:\/\/.*\/api\/v1\/ws\/galaxy$/);
 ws.send({ type: 'new_puzzle', data: node({ id: 'other' }) });
 expect(store.nodes[0].id).toBe('hash');
 ws.send({ type: 'new_puzzle', data: { id: 'legacy', difficulty: 'Easy', se_rating: 1, edges: [{ source: 'hash', target: 'legacy', similarity: 0.5 }] } });
 expect(store.nodes[1]).toMatchObject({ id: 'legacy', play_count: 1, max_technique: null, techniques: [] });
 expect(store.edges).toHaveLength(1);
 ws.send({ type: 'play_result', data: { puzzle_hash: 'hash', play_count: 9 } }); expect(store.nodes[0].play_count).toBe(9);
 ws.send({ type: 'play_result', data: { puzzle_hash: 'legacy' } }); expect(store.nodes[1].play_count).toBe(0);
 store.updateNodePlayCount('missing', 2); expect(store.nodes).toHaveLength(2);
 ws.onmessage?.({ data: 'invalid JSON' }); ws.send({ type: 'unknown' }); expect(store.nodes).toHaveLength(2);
 ws.onerror?.(); expect(ws.close).toHaveBeenCalledTimes(1);
 ws.onclose?.(); await vi.advanceTimersByTimeAsync(5000); expect(Socket.instances).toHaveLength(2);
 const newSocket = Socket.instances[1]; store.disconnectWebSocket(); store.disconnectWebSocket();
 expect(store.ws).toBeNull(); expect(newSocket.onclose).toBeNull(); expect(newSocket.close).toHaveBeenCalledOnce();
});

it('uses secure WebSockets on HTTPS and tolerates unsupported browsers', async () => {
 const { galaxyStore } = await import('../src/lib/stores/galaxy.svelte');
 vi.stubGlobal('location', { protocol: 'https:', host: 'ukodus.example' }); galaxyStore.connectWebSocket();
 expect(Socket.instances[0].url).toBe('wss://ukodus.example/api/v1/ws/galaxy'); galaxyStore.disconnectWebSocket();
 vi.stubGlobal('WebSocket', class { constructor() { throw new Error('unavailable'); } });
 expect(() => galaxyStore.connectWebSocket()).not.toThrow();
});
