import { apiClient } from '$lib/api/client';
import type { PregeneratedPuzzle } from './puzzle-prefetch';

const BASE_WEIGHTS: Record<string, number> = { Hard: 10, Expert: 25, Master: 35, Extreme: 30 };
const CAPS: Record<string, number> = { Hard: 15, Expert: 15, Master: 10, Extreme: 10 };
const DELAY_MS = 5_000;
const INVENTORY_REFRESH_INTERVAL = 5;

class MiningCoordinator {
	private worker: Worker | null = null;
	private active = false;
	private perDifficulty: Record<string, number> = {};
	private inventory: Record<string, number> = {};
	private cycleCount = 0;
	private timer: ReturnType<typeof setTimeout> | null = null;

	start(): void {
		const apiKey =
			typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.MINING_API_KEY : undefined;
		if (!apiKey) return;

		if (this.active) return;
		this.active = true;
		this.perDifficulty = {};
		this.inventory = {};
		this.cycleCount = 0;

		this.refreshInventory(apiKey).then(() => this.scheduleNext(apiKey));
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

	private async refreshInventory(apiKey: string): Promise<void> {
		const resp = await apiClient.fetchPoolInventory(apiKey);
		if (resp) {
			this.inventory = {};
			for (const { difficulty, count } of resp.counts) {
				this.inventory[difficulty] = count;
			}
		}
	}

	private pickDifficulty(): string | null {
		const weights: Record<string, number> = {};
		for (const [diff, base] of Object.entries(BASE_WEIGHTS)) {
			const used = this.perDifficulty[diff] ?? 0;
			if (used >= (CAPS[diff] ?? 0)) {
				weights[diff] = 0;
				continue;
			}
			const poolCount = this.inventory[diff] ?? 0;
			const scarcityMultiplier = Math.max(1, 20 / (poolCount + 1));
			weights[diff] = base * scarcityMultiplier;
		}

		const total = Object.values(weights).reduce((a, b) => a + b, 0);
		if (total === 0) return null;

		let r = Math.random() * total;
		for (const [diff, w] of Object.entries(weights)) {
			r -= w;
			if (r <= 0) return diff;
		}

		// Fallback to last non-zero weight
		const entries = Object.entries(weights).filter(([, w]) => w > 0);
		return entries.length > 0 ? entries[entries.length - 1][0] : null;
	}

	private scheduleNext(apiKey: string): void {
		if (!this.active) return;

		this.cycleCount++;

		if (this.cycleCount % INVENTORY_REFRESH_INTERVAL === 0) {
			this.refreshInventory(apiKey).then(() => this.doSchedule(apiKey));
		} else {
			this.doSchedule(apiKey);
		}
	}

	private doSchedule(apiKey: string): void {
		if (!this.active) return;

		const difficulty = this.pickDifficulty();
		if (!difficulty) {
			this.stop();
			return;
		}

		this.timer = setTimeout(() => {
			this.mine(apiKey, difficulty);
		}, DELAY_MS);
	}

	private mine(apiKey: string, difficulty: string): void {
		if (!this.active) return;

		this.ensureWorker();

		const handler = async (e: MessageEvent) => {
			if (e.data.type !== 'generated') return;
			this.worker?.removeEventListener('message', handler);

			const puzzle = e.data.data as PregeneratedPuzzle;
			this.perDifficulty[difficulty] = (this.perDifficulty[difficulty] ?? 0) + 1;

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
