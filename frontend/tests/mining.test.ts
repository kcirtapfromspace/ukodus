import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/lib/api/client', () => ({ apiClient: { fetchPoolInventory: vi.fn(), submitMinedPuzzle: vi.fn() } }));
class WorkerMock extends EventTarget {
 static instances: WorkerMock[] = [];
 postMessage = vi.fn(); terminate = vi.fn();
 onerror: ((event: Event) => void) | null = null;
 constructor() { super(); WorkerMock.instances.push(this); }
 result(type = 'generated') {
  this.dispatchEvent(new MessageEvent('message', { data: { type, data: { puzzle_hash: 'hash', puzzle_string: 'puzzle', solution_string: 'solution', difficulty: 'Hard', se_rating: 4, short_code: 'ABCDEFGH' } } }));
 }
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); WorkerMock.instances = []; vi.stubGlobal('Worker', WorkerMock); delete window.__RUNTIME_CONFIG__; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('does no background work without an API key and cancels startup before inventory returns', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 mining.start(); expect(apiClient.fetchPoolInventory).not.toHaveBeenCalled();
 let finish!: (value: null) => void;
 vi.mocked(apiClient.fetchPoolInventory).mockReturnValue(new Promise(resolve => { finish = resolve; }));
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'test-key' }; mining.start(); mining.start();
 expect(apiClient.fetchPoolInventory).toHaveBeenCalledOnce();
 mining.stop(); finish(null); await vi.advanceTimersByTimeAsync(10000);
 expect(WorkerMock.instances).toHaveLength(0);
});

it('submits worker results, refreshes inventory and stops at every per-session difficulty cap', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 vi.mocked(apiClient.fetchPoolInventory).mockResolvedValue({ counts: [{ difficulty: 'Hard', count: 20 }] });
 vi.mocked(apiClient.submitMinedPuzzle).mockResolvedValue(true);
 // The lower RNG boundary must never select a zero-weight, already capped tier.
 vi.spyOn(Math, 'random').mockReturnValue(0);
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'test-key' }; mining.start();
 for (let index = 0; index < 50; index++) {
  await vi.advanceTimersByTimeAsync(5000);
  const worker = WorkerMock.instances[0];
  if (index === 0) { worker.result('progress'); expect(apiClient.submitMinedPuzzle).not.toHaveBeenCalled(); }
  worker.result(); await Promise.resolve();
 }
 await vi.advanceTimersByTimeAsync(10000);
 const worker = WorkerMock.instances[0];
 expect(WorkerMock.instances).toHaveLength(1);
 const difficulties = worker.postMessage.mock.calls.map(([message]) => message.difficulty);
 expect(difficulties.filter(d => d === 'Hard')).toHaveLength(15);
 expect(difficulties.filter(d => d === 'Expert')).toHaveLength(15);
 expect(difficulties.filter(d => d === 'Master')).toHaveLength(10);
 expect(difficulties.filter(d => d === 'Extreme')).toHaveLength(10);
 expect(apiClient.submitMinedPuzzle).toHaveBeenCalledTimes(50);
 expect(apiClient.submitMinedPuzzle).toHaveBeenCalledWith(expect.objectContaining({ puzzle_hash: 'hash', solution_string: 'solution' }), 'test-key');
 expect(vi.mocked(apiClient.fetchPoolInventory).mock.calls.length).toBeGreaterThan(1);
 expect(worker.terminate).toHaveBeenCalledOnce();
});

it('continues when the pool is unavailable or a submission fails, and cancels pending work on stop', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 vi.mocked(apiClient.fetchPoolInventory).mockResolvedValue(null); vi.mocked(apiClient.submitMinedPuzzle).mockResolvedValue(false);
 vi.spyOn(Math, 'random').mockReturnValue(0.99);
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'test-key' }; mining.start();
 await vi.advanceTimersByTimeAsync(5000);
 const worker = WorkerMock.instances[0]; expect(worker.postMessage).toHaveBeenCalledWith({ type: 'generate', difficulty: 'Extreme' });
 worker.result(); await Promise.resolve(); mining.stop(); await vi.advanceTimersByTimeAsync(10000);
 expect(worker.postMessage).toHaveBeenCalledOnce(); expect(worker.terminate).toHaveBeenCalledOnce();
});

it('recovers from generation errors and stops cleanly when workers are unavailable', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 vi.mocked(apiClient.fetchPoolInventory).mockResolvedValue(null);
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'key' }; mining.start();
 await vi.advanceTimersByTimeAsync(5000);
 const worker = WorkerMock.instances[0]; worker.result('error');
 expect(apiClient.submitMinedPuzzle).not.toHaveBeenCalled();
 await vi.advanceTimersByTimeAsync(5000); expect(worker.postMessage).toHaveBeenCalledTimes(2);
 mining.stop(); worker.result(); expect(apiClient.submitMinedPuzzle).not.toHaveBeenCalled();
 vi.stubGlobal('Worker', class { constructor() { throw new Error('workers disabled'); } });
 mining.start(); await vi.advanceTimersByTimeAsync(5000); expect(vi.getTimerCount()).toBe(0);
});

it('stops background work after a worker crashes and creates a fresh worker on restart', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 vi.mocked(apiClient.fetchPoolInventory).mockResolvedValue(null);
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'key' };
 mining.start(); await vi.advanceTimersByTimeAsync(5000);
 const crashed = WorkerMock.instances[0];
 crashed.onerror!(new Event('error'));
 await vi.advanceTimersByTimeAsync(10000);
 expect(crashed.terminate).toHaveBeenCalledOnce();
 expect(crashed.postMessage).toHaveBeenCalledOnce();
 expect(apiClient.submitMinedPuzzle).not.toHaveBeenCalled();
 expect(vi.getTimerCount()).toBe(0);
 mining.start(); await vi.advanceTimersByTimeAsync(5000);
 expect(WorkerMock.instances).toHaveLength(2);
 expect(WorkerMock.instances[1].postMessage).toHaveBeenCalledOnce();
 mining.stop();
});

it('does not resume mining when a periodic inventory refresh completes after stopping', async () => {
 const { miningCoordinator: mining } = await import('../src/lib/wasm/mining-coordinator');
 const { apiClient } = await import('../src/lib/api/client');
 let finish!: (value: null) => void;
 vi.mocked(apiClient.fetchPoolInventory)
  .mockResolvedValueOnce(null)
  .mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
 vi.mocked(apiClient.submitMinedPuzzle).mockResolvedValue(true);
 window.__RUNTIME_CONFIG__ = { MINING_API_KEY: 'key' };
 mining.start();
 for (let index = 0; index < 4; index++) {
  await vi.advanceTimersByTimeAsync(5000);
  WorkerMock.instances[0].result();
  await Promise.resolve();
 }
 expect(apiClient.fetchPoolInventory).toHaveBeenCalledTimes(2);
 mining.stop(); finish(null);
 await vi.advanceTimersByTimeAsync(10000);
 expect(WorkerMock.instances[0].postMessage).toHaveBeenCalledTimes(4);
 expect(vi.getTimerCount()).toBe(0);
});
