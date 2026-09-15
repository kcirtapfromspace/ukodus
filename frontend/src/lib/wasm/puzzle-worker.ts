// Runs in a Worker thread — no DOM access needed
import { loadWasm, type ArithmeticReplay, type ArithmeticSearchOptions, type ArithmeticState } from './loader';

type WorkerRequest =
	| { type: 'generate'; difficulty: string }
	| { type: 'arithmetic-search'; id: string; state: ArithmeticState; options?: ArithmeticSearchOptions }
	| { type: 'arithmetic-verify'; id: string; replay: ArithmeticReplay };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
	const request = e.data;
	if (request.type === 'generate') {
		const { difficulty } = request;
		try {
			const wasmModule = await loadWasm();
			const json = wasmModule.generate_puzzle_json(difficulty);
			self.postMessage({ type: 'generated', data: JSON.parse(json), difficulty });
		} catch {
			self.postMessage({ type: 'error', difficulty });
		}
	} else if (request.type === 'arithmetic-search' || request.type === 'arithmetic-verify') {
		try {
			const wasmModule = await loadWasm();
			if (request.type === 'arithmetic-search') {
				const json = wasmModule.search_arithmetic_json(JSON.stringify(request.state),
					request.options ? JSON.stringify(request.options) : '');
				self.postMessage({ type: 'arithmetic-result', id: request.id, data: JSON.parse(json) });
			} else {
				const valid = wasmModule.verify_arithmetic_replay_json(JSON.stringify(request.replay));
				self.postMessage({ type: 'arithmetic-verified', id: request.id, valid });
			}
		} catch (error) {
			self.postMessage({ type: 'arithmetic-error', id: request.id,
				error: error instanceof Error ? error.message : String(error) });
		}
	}
};
