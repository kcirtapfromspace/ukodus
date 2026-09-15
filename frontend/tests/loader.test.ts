import { beforeEach, expect, it, vi } from 'vitest';
const version = import.meta.env.VITE_WASM_ASSET_VERSION;
const wasmPath = `/wasm/sudoku_wasm.js?v=${version}`;
beforeEach(() => {
 vi.resetModules();
 vi.doMock(wasmPath, () => ({ default: vi.fn(), SudokuGame: class {}, generate_puzzle_json: vi.fn() }));
});
it('initializes matching content-versioned JS and WASM once and reuses its exports', async () => {
 expect(version).toMatch(/^[a-f0-9]{64}$/);
 const { loadWasm } = await import('../src/lib/wasm/loader');
 const module = await loadWasm();
 expect(module.default).toHaveBeenCalledExactlyOnceWith({ module_or_path: new URL(`/wasm/sudoku_wasm_bg.wasm?v=${version}`, location.origin) });
 expect(await loadWasm()).toBe(module); expect(module.default).toHaveBeenCalledOnce();
});
it('allows a retry after WASM initialization fails', async () => {
 const { loadWasm } = await import('../src/lib/wasm/loader');
 const wasm = await import(/* @vite-ignore */ wasmPath) as Awaited<ReturnType<typeof loadWasm>>;
 vi.mocked(wasm.default).mockRejectedValueOnce(new Error('download failed'));
 await expect(loadWasm()).rejects.toThrow('download failed');
 expect(await loadWasm()).toBe(wasm);
});
