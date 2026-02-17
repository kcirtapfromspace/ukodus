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

interface WasmModule {
	default: (options?: { module_or_path?: URL }) => Promise<void>;
	SudokuGame: new (canvasId: string) => SudokuGame;
}

let wasmModule: WasmModule | null = null;

export async function loadWasm(): Promise<WasmModule> {
	if (wasmModule) return wasmModule;

	// Dynamic path prevents Rollup from trying to resolve at build time
	const wasmJsPath = '/wasm/sudoku_wasm.js';
	const mod = (await import(/* @vite-ignore */ wasmJsPath)) as WasmModule;
	await mod.default({
		module_or_path: new URL('/wasm/sudoku_wasm_bg.wasm', window.location.origin)
	});

	wasmModule = mod;
	return mod;
}
