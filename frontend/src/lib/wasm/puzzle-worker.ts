// Runs in a Worker thread — no DOM access needed
let wasmModule: { generate_puzzle_json: (difficulty: string) => string } | null = null;

async function loadWasm() {
	const origin = self.location.origin;
	const mod = await import(/* @vite-ignore */ `${origin}/wasm/sudoku_wasm.js`);
	await mod.default({
		module_or_path: new URL('/wasm/sudoku_wasm_bg.wasm', origin)
	});
	return mod as { generate_puzzle_json: (difficulty: string) => string };
}

self.onmessage = async (e: MessageEvent) => {
	const { type, difficulty } = e.data;
	if (type === 'generate') {
		if (!wasmModule) {
			wasmModule = await loadWasm();
		}
		const json = wasmModule!.generate_puzzle_json(difficulty);
		self.postMessage({ type: 'generated', data: JSON.parse(json), difficulty });
	}
};
