// Runs in a Worker thread — no DOM access needed
let wasmModule: { generate_puzzle_json: (difficulty: string) => string } | null = null;

self.onmessage = async (e: MessageEvent) => {
	const { type, difficulty } = e.data;
	if (type === 'generate') {
		if (!wasmModule) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const mod = (await import(/* @vite-ignore */ '/wasm/sudoku_wasm.js')) as any;
			await mod.default({
				module_or_path: new URL('/wasm/sudoku_wasm_bg.wasm', self.location.origin)
			});
			wasmModule = mod;
		}
		const json = wasmModule!.generate_puzzle_json(difficulty);
		self.postMessage({ type: 'generated', data: JSON.parse(json), difficulty });
	}
};
