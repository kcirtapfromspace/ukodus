import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('/wasm/sudoku_wasm.js', () => ({ default: vi.fn(), SudokuGame: class {}, generate_puzzle_json: vi.fn() }));
beforeEach(() => vi.resetModules());
it('initializes the shipped WASM URL once and reuses its exports', async () => {
 const { loadWasm } = await import('../src/lib/wasm/loader');
 const module = await loadWasm();
 expect(module.default).toHaveBeenCalledExactlyOnceWith({ module_or_path: new URL('/wasm/sudoku_wasm_bg.wasm', location.origin) });
 expect(await loadWasm()).toBe(module); expect(module.default).toHaveBeenCalledOnce();
});
it('allows a retry after WASM initialization fails', async () => {
 const { loadWasm } = await import('../src/lib/wasm/loader');
 const wasmPath = '/wasm/sudoku_wasm.js';
 const wasm = await import(/* @vite-ignore */ wasmPath) as Awaited<ReturnType<typeof loadWasm>>;
 vi.mocked(wasm.default).mockRejectedValueOnce(new Error('download failed'));
 await expect(loadWasm()).rejects.toThrow('download failed');
 expect(await loadWasm()).toBe(wasm);
});
