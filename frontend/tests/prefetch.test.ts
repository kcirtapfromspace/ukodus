import { afterEach, beforeEach, expect, it, vi } from 'vitest';
class WorkerMock {
 static instances: WorkerMock[] = [];
 onmessage: ((event: { data: unknown }) => void) | null = null;
 onerror: (() => void) | null = null;
 postMessage = vi.fn(); terminate = vi.fn();
 constructor() { WorkerMock.instances.push(this); }
 result(difficulty = 'hard', type = 'generated') { this.onmessage?.({ data: { type, difficulty, data: { puzzle_hash: 'test', difficulty } } }); }
}
beforeEach(() => { vi.resetModules(); WorkerMock.instances = []; vi.stubGlobal('Worker', WorkerMock); });
afterEach(() => { vi.unstubAllGlobals(); });

it('warms each difficulty once and caches the result until it is consumed', async () => {
 const { puzzlePrefetch: prefetch } = await import('../src/lib/wasm/puzzle-prefetch');
 expect(prefetch.take('hard')).toBeNull();
 prefetch.warmup('hard'); prefetch.warmup('hard');
 const worker = WorkerMock.instances[0]; expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'generate', difficulty: 'hard' });
 worker.result(); prefetch.warmup('hard'); expect(worker.postMessage).toHaveBeenCalledOnce();
 expect(prefetch.take('hard')).toEqual({ puzzle_hash: 'test', difficulty: 'hard' }); expect(prefetch.take('hard')).toBeNull();
 prefetch.warmup('easy'); worker.result('easy');
 expect(await prefetch.get('easy')).toEqual({ puzzle_hash: 'test', difficulty: 'easy' });
 prefetch.destroy(); expect(worker.terminate).toHaveBeenCalledOnce(); prefetch.destroy();
});

it('shares in-flight generation with warmup and all waiting consumers', async () => {
 const { puzzlePrefetch: prefetch } = await import('../src/lib/wasm/puzzle-prefetch');
 prefetch.warmup('hard');
 const one = prefetch.get('hard'), two = prefetch.get('hard'), easy = prefetch.get('easy');
 const worker = WorkerMock.instances[0]; expect(worker.postMessage).toHaveBeenCalledTimes(2);
 worker.result('hard', 'progress'); expect(prefetch.take('hard')).toBeNull();
 worker.result(); worker.result('easy');
 expect(await one).toEqual(await two); expect((await easy).difficulty).toBe('easy');
 expect(prefetch.take('hard')).toBeNull(); prefetch.destroy();
});

it('rejects abandoned and failed generation so callers can fall back instead of hanging', async () => {
 const { puzzlePrefetch: prefetch } = await import('../src/lib/wasm/puzzle-prefetch');
 const pending = prefetch.get('hard'); const assertion = expect(pending).rejects.toThrow('generation failed');
 WorkerMock.instances[0].result('hard', 'error'); await assertion;
 const retry = prefetch.get('hard'); const stopped = expect(retry).rejects.toThrow('generation stopped');
 WorkerMock.instances[0].onerror?.(); await stopped;
 expect(WorkerMock.instances[0].terminate).toHaveBeenCalledOnce();
 prefetch.warmup('hard'); expect(WorkerMock.instances).toHaveLength(2);
 WorkerMock.instances[1].result('hard', 'error'); prefetch.destroy();
});
