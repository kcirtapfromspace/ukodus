import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../src/lib/wasm/loader', () => ({ loadWasm: vi.fn() }));
afterEach(() => { self.onmessage = null; vi.restoreAllMocks(); });
it('runs generation in a worker, preserves correlation and reports failures for caller fallback', async () => {
 const { loadWasm } = await import('../src/lib/wasm/loader');
 const generate = vi.fn(() => JSON.stringify({ puzzle_hash: 'hash' }));
 vi.mocked(loadWasm).mockResolvedValue({ generate_puzzle_json: generate } as unknown as Awaited<ReturnType<typeof loadWasm>>);
 const post = vi.spyOn(self, 'postMessage').mockImplementation(() => {});
 await import('../src/lib/wasm/puzzle-worker');
 const dispatch = async (data: unknown) => { await self.onmessage?.call(self, new MessageEvent('message', { data })); };
 await dispatch({ type: 'unknown' }); expect(loadWasm).not.toHaveBeenCalled();
 await dispatch({ type: 'generate', difficulty: 'hard' });
 expect(generate).toHaveBeenCalledWith('hard');
 expect(post).toHaveBeenCalledWith({ type: 'generated', data: { puzzle_hash: 'hash' }, difficulty: 'hard' });
 generate.mockReturnValue('invalid'); await dispatch({ type: 'generate', difficulty: 'easy' });
 expect(post).toHaveBeenLastCalledWith({ type: 'error', difficulty: 'easy' });
 vi.mocked(loadWasm).mockRejectedValue(new Error('network failure')); await dispatch({ type: 'generate', difficulty: 'medium' });
 expect(post).toHaveBeenLastCalledWith({ type: 'error', difficulty: 'medium' });
});
