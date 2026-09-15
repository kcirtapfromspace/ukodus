export interface SudokuGame {
	tick(): void;
	resize(width: number, height: number): void;
	set_theme(theme: string): void;
	handle_key(event: KeyboardEvent): void;
	is_complete(): boolean;
	is_game_over(): boolean;
	get_puzzle_string(): string;
	get_short_code(): string;
	difficulty(): string;
	se_rating(): number;
	elapsed_secs(): number;
	mistakes(): number;
	hints_used(): number;
	get_state_json(): string;
	get_arithmetic_state_json(): string;
	get_current_arithmetic_replay_json(): string;
	get_stats_json(): string;
	load_state_json(json: string): void;
	load_stats_json(json: string): void;
	load_short_code(code: string): void;
	load_puzzle_string(puzzle: string): void;
	is_secrets_unlocked?(): boolean;
	set_secrets_unlocked?(unlocked: boolean): void;
	get_move_log?(): string;
	load_pregenerated?(json: string): boolean;
	screen_state?(): string;
	take_pending_difficulty?(): string;
	new_game(difficulty: string): void;
}

export interface ArithmeticState {
	version: number;
	values: number[];
	/** Candidate bits 0..8 represent digits 1..9; filled cells contain a singleton. */
	domains: number[];
}

export interface ArithmeticProof {
	version: number;
	state_hash: string;
	terms: Array<{
		requirement: { Cell: { cell: number } } | { SectorDigit: { sector: number; digit: number } };
		weight: number;
	}>;
	cell: number;
	digit: number;
	value: boolean;
	terminal?: 'IntervalGcd' | { Residue: { modulus: number } };
}

export interface ArithmeticReplay {
	version: number;
	state: ArithmeticState;
	proof: ArithmeticProof;
}

export interface ArithmeticSearchOptions {
	max_sources: number;
	max_weight: number;
	beam_width: number;
	max_combinations: number;
}

export interface ArithmeticSearchResult {
	hint: {
		technique: 'ArithmeticCounting';
		hint_type: { SetValue: { pos: { row: number; col: number }; value: number } }
			| { EliminateCandidates: { pos: { row: number; col: number }; values: number[] } };
		explanation: string;
		involved_cells: Array<{ row: number; col: number }>;
	} | null;
	replay: ArithmeticReplay | null;
	tested_combinations: number;
	budget_exhausted: boolean;
	beam_pruned: boolean;
	error: string | null;
}

export interface WasmModule {
	default: (options?: { module_or_path?: URL }) => Promise<void>;
	SudokuGame: new (canvasId: string) => SudokuGame;
	generate_puzzle_json: (difficulty: string) => string;
	search_arithmetic_json: (stateJson: string, optionsJson: string) => string;
	verify_arithmetic_replay_json: (replayJson: string) => boolean;
}

let wasmModule: WasmModule | null = null;

export async function loadWasm(): Promise<WasmModule> {
	if (wasmModule) return wasmModule;

	// Dynamic path prevents Rollup from trying to resolve at build time
	// A shared content hash keeps browser and CDN caches on the same engine build.
	const version = import.meta.env.VITE_WASM_ASSET_VERSION;
	const wasmJsPath = `/wasm/sudoku_wasm.js?v=${version}`;
	const mod = (await import(/* @vite-ignore */ wasmJsPath)) as WasmModule;
	await mod.default({
		module_or_path: new URL(`/wasm/sudoku_wasm_bg.wasm?v=${version}`, globalThis.location.origin)
	});

	wasmModule = mod;
	return mod;
}
