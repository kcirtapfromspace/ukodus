export interface PregeneratedPuzzle {
	puzzle_hash: string;
	puzzle_string: string;
	solution_string: string;
	difficulty: string;
	se_rating: number;
	short_code: string;
}

class PuzzlePrefetch {
	private worker: Worker | null = null;
	private cache: Map<string, PregeneratedPuzzle> = new Map();
	private pending: Map<string, Array<{ resolve: (p: PregeneratedPuzzle) => void; reject: (error: Error) => void }>> = new Map();

	/** Start worker and begin generating for a difficulty. */
	warmup(difficulty: string): void {
		if (this.cache.has(difficulty)) return;
		if (this.pending.has(difficulty)) return;
		this.ensureWorker();
		this.pending.set(difficulty, []);
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

		return new Promise<PregeneratedPuzzle>((resolve, reject) => {
			const waiters = this.pending.get(difficulty);
			if (waiters) {
				waiters.push({ resolve, reject });
			} else {
				this.pending.set(difficulty, [{ resolve, reject }]);
				this.worker!.postMessage({ type: 'generate', difficulty });
			}
		});
	}

	/** Shut down worker. */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.cache.clear();
		for (const waiters of this.pending.values()) {
			for (const waiter of waiters) waiter.reject(new Error('Puzzle generation stopped'));
		}
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
				const waiters = this.pending.get(difficulty);
				this.pending.delete(difficulty);
				if (waiters && waiters.length > 0) {
					for (const waiter of waiters) waiter.resolve(puzzle);
				} else {
					this.cache.set(difficulty, puzzle);
				}
			} else if (type === 'error') {
				const waiters = this.pending.get(difficulty) || [];
				this.pending.delete(difficulty);
				for (const waiter of waiters) waiter.reject(new Error('Puzzle generation failed'));
			}
		};
		this.worker.onerror = () => this.destroy();
	}
}

export const puzzlePrefetch = new PuzzlePrefetch();
