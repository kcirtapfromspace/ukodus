export interface PregeneratedPuzzle {
	puzzle_string: string;
	solution_string: string;
	difficulty: string;
	se_rating: number;
	short_code: string;
}

class PuzzlePrefetch {
	private worker: Worker | null = null;
	private cache: Map<string, PregeneratedPuzzle> = new Map();
	private pending: Map<string, { resolve: (p: PregeneratedPuzzle) => void }> = new Map();

	/** Start worker and begin generating for a difficulty. */
	warmup(difficulty: string): void {
		if (this.cache.has(difficulty)) return;
		if (this.pending.has(difficulty)) return;
		this.ensureWorker();
		this.pending.set(difficulty, { resolve: () => {} });
		this.worker!.postMessage({ type: 'generate', difficulty });
	}

	/** Get cached puzzle (removes from cache), or null if not ready. */
	take(difficulty: string): PregeneratedPuzzle | null {
		const cached = this.cache.get(difficulty);
		if (cached) {
			this.cache.delete(difficulty);
			return cached;
		}
		return null;
	}

	/** Wait for a puzzle of the given difficulty (triggers generation if needed). */
	async get(difficulty: string): Promise<PregeneratedPuzzle> {
		const cached = this.take(difficulty);
		if (cached) return cached;

		this.ensureWorker();

		return new Promise<PregeneratedPuzzle>((resolve) => {
			this.pending.set(difficulty, { resolve });
			this.worker!.postMessage({ type: 'generate', difficulty });
		});
	}

	/** Shut down worker. */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.cache.clear();
		this.pending.clear();
	}

	private ensureWorker(): void {
		if (this.worker) return;
		this.worker = new Worker(
			new URL('./puzzle-worker.ts', import.meta.url),
			{ type: 'module' }
		);
		this.worker.onmessage = (e: MessageEvent) => {
			const { type, data, difficulty } = e.data;
			if (type === 'generated') {
				const puzzle = data as PregeneratedPuzzle;
				const waiter = this.pending.get(difficulty);
				if (waiter && waiter.resolve !== (() => {})) {
					this.pending.delete(difficulty);
					waiter.resolve(puzzle);
				} else {
					this.pending.delete(difficulty);
					this.cache.set(difficulty, puzzle);
				}
			}
		};
	}
}

export const puzzlePrefetch = new PuzzlePrefetch();
