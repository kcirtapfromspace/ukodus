import { apiClient } from '$lib/api/client';
import type { PregeneratedPuzzle } from './puzzle-prefetch';

const DIFFICULTIES = ['Hard', 'Expert', 'Master', 'Extreme'];
const MAX_PER_SESSION = 10;
const DELAY_MS = 5_000;

class MiningCoordinator {
	private worker: Worker | null = null;
	private active = false;
	private submittedCount = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;

	start(): void {
		const apiKey = typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.MINING_API_KEY : undefined;
		if (!apiKey) return;

		if (this.active) return;
		this.active = true;
		this.submittedCount = 0;
		this.scheduleNext(apiKey);
	}

	stop(): void {
		this.active = false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
	}

	private scheduleNext(apiKey: string): void {
		if (!this.active || this.submittedCount >= MAX_PER_SESSION) {
			this.stop();
			return;
		}

		this.timer = setTimeout(() => {
			this.mine(apiKey);
		}, DELAY_MS);
	}

	private mine(apiKey: string): void {
		if (!this.active) return;

		this.ensureWorker();
		const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

		const handler = async (e: MessageEvent) => {
			if (e.data.type !== 'generated') return;
			this.worker?.removeEventListener('message', handler);

			const puzzle = e.data.data as PregeneratedPuzzle;
			this.submittedCount++;

			await apiClient.submitMinedPuzzle(
				{
					puzzle_hash: puzzle.puzzle_hash,
					puzzle_string: puzzle.puzzle_string,
					solution_string: puzzle.solution_string,
					difficulty: puzzle.difficulty,
					se_rating: puzzle.se_rating,
					short_code: puzzle.short_code
				},
				apiKey
			);

			this.scheduleNext(apiKey);
		};

		this.worker!.addEventListener('message', handler);
		this.worker!.postMessage({ type: 'generate', difficulty });
	}

	private ensureWorker(): void {
		if (this.worker) return;
		this.worker = new Worker(new URL('./puzzle-worker.ts', import.meta.url), {
			type: 'module'
		});
	}
}

export const miningCoordinator = new MiningCoordinator();
