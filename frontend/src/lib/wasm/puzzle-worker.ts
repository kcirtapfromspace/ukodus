// Runs in a Worker thread — no DOM access needed
import { loadWasm } from './loader';

self.onmessage = async (e: MessageEvent) => {
	const { type, difficulty } = e.data;
	if (type === 'generate') {
		try {
			const wasmModule = await loadWasm();
			const json = wasmModule.generate_puzzle_json(difficulty);
			self.postMessage({ type: 'generated', data: JSON.parse(json), difficulty });
		} catch {
			self.postMessage({ type: 'error', difficulty });
		}
	}
};
