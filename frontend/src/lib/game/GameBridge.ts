import { playerStore } from '$lib/stores/player.svelte';
import { apiClient } from '$lib/api/client';
import type { SudokuGame } from '$lib/wasm/loader';
import { puzzlePrefetch } from '$lib/wasm/puzzle-prefetch';

const POLL_INTERVAL_MS = 2000;

function hashPuzzle(puzzleString: string): string {
	let hash = 0;
	for (let i = 0; i < puzzleString.length; i++) {
		const ch = puzzleString.charCodeAt(i);
		hash = ((hash << 5) - hash + ch) | 0;
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
}

function stdDev(values: number[]): number {
	if (values.length < 2) return 0;
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const sqDiffs = values.map((v) => (v - mean) ** 2);
	return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export class GameBridge {
	private game: SudokuGame;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private reported = false;
	private moveTimes: number[] = [];
	private lastMoveTimestamp: number | null = null;
	private keyHandler: ((e: KeyboardEvent) => void) | null = null;

	constructor(game: SudokuGame) {
		this.game = game;
	}

	start() {
		this.reported = false;
		this.moveTimes = [];
		this.lastMoveTimestamp = null;

		this.keyHandler = (e: KeyboardEvent) => {
			if (e.key >= '1' && e.key <= '9') {
				const now = performance.now();
				if (this.lastMoveTimestamp !== null) {
					this.moveTimes.push(now - this.lastMoveTimestamp);
				}
				this.lastMoveTimestamp = now;
			}
		};
		document.addEventListener('keydown', this.keyHandler, true);

		this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
	}

	stop() {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
		if (this.keyHandler) {
			document.removeEventListener('keydown', this.keyHandler, true);
			this.keyHandler = null;
		}
	}

	private poll() {
		try {
			const complete = this.game.is_complete();
			const gameOver = this.game.is_game_over();

			if (complete || gameOver) {
				if (!this.reported) {
					this.reported = true;
					this.submitResult(complete);

					// Pre-generate next puzzle for the same difficulty
					try {
						const currentDiff = this.game.difficulty()?.toLowerCase() || 'medium';
						puzzlePrefetch.warmup(currentDiff);
					} catch { /* not critical */ }
				}
			} else if (this.reported) {
				this.reported = false;
				this.moveTimes = [];
				this.lastMoveTimestamp = null;
			}
		} catch {
			/* poll error */
		}
	}

	private async submitResult(won: boolean) {
		try {
			const puzzleString = this.game.get_puzzle_string();
			const shortCode = this.game.get_short_code();
			const difficulty = this.game.difficulty();
			const seRating = this.game.se_rating();
			const elapsedSecs = this.game.elapsed_secs();
			const mistakes = this.game.mistakes();
			const hintsUsed = this.game.hints_used();

			const movesCount = this.moveTimes.length + 1;
			const avgMoveTimeMs =
				this.moveTimes.length > 0
					? Math.round(this.moveTimes.reduce((a, b) => a + b, 0) / this.moveTimes.length)
					: 0;
			const minMoveTimeMs =
				this.moveTimes.length > 0 ? Math.round(Math.min(...this.moveTimes)) : 0;
			const moveTimeStdDev = Math.round(stdDev(this.moveTimes));

			let moveLog: unknown = null;
			try {
				const logJson = this.game.get_move_log?.();
				if (logJson && logJson !== '[]') moveLog = JSON.parse(logJson);
			} catch {
				/* old WASM binary */
			}

			await apiClient.submitResult({
				player_id: playerStore.id,
				player_tag: playerStore.tag || null,
				puzzle_hash: hashPuzzle(puzzleString),
				puzzle_string: puzzleString,
				short_code: shortCode || null,
				difficulty,
				se_rating: seRating,
				result: won ? 'Win' : 'Loss',
				time_secs: elapsedSecs,
				mistakes,
				hints_used: hintsUsed,
				moves_count: movesCount,
				avg_move_time_ms: avgMoveTimeMs,
				min_move_time_ms: minMoveTimeMs,
				move_time_std_dev: moveTimeStdDev,
				move_log: moveLog
			});
		} catch {
			/* submit error */
		}
	}
}
