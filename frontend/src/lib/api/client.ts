export type {
	ResultPayload,
	SharePayload,
	LeaderboardEntry,
	GalaxyNode,
	GalaxyEdge,
	GalaxyOverview,
	GalaxyStats,
	PuzzleDetail,
	MinedPuzzleInput,
	MinedPuzzleResponse
} from './types';

import type {
	ResultPayload,
	SharePayload,
	LeaderboardEntry,
	GalaxyOverview,
	GalaxyStats,
	PuzzleDetail,
	MinedPuzzleInput,
	MinedPuzzleResponse
} from './types';

const API_BASE = '';

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T | null> {
	for (let i = 0; i < retries; i++) {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return (await res.json()) as T;
		} catch (e) {
			if (i < retries - 1) {
				await new Promise((r) => setTimeout(r, 500 * (i + 1)));
			} else {
				console.warn(`Failed to fetch ${url} after ${retries} attempts:`, e);
				return null;
			}
		}
	}
	return null;
}

class ApiClient {
	async submitResult(payload: ResultPayload): Promise<boolean> {
		try {
			const resp = await fetch(`${API_BASE}/api/v1/results`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!resp.ok) {
				const text = await resp.text().catch(() => '');
				console.warn('[API] result submit failed:', resp.status, text);
				return false;
			}
			return true;
		} catch (err) {
			console.warn('[API] result submit error:', err);
			return false;
		}
	}

	async registerShare(payload: SharePayload): Promise<void> {
		fetch(`${API_BASE}/api/v1/share`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		}).catch(() => {});
	}

	async fetchLeaderboard(params: {
		difficulty?: string;
		puzzle_hash?: string;
		limit?: number;
	}): Promise<LeaderboardEntry[]> {
		const searchParams = new URLSearchParams();
		if (params.difficulty) searchParams.set('difficulty', params.difficulty);
		if (params.puzzle_hash) searchParams.set('puzzle_hash', params.puzzle_hash);
		if (params.limit) searchParams.set('limit', String(params.limit));

		const data = await fetchWithRetry<LeaderboardEntry[]>(
			`${API_BASE}/api/v1/results/leaderboard?${searchParams}`
		);
		return data || [];
	}

	async fetchGalaxyOverview(): Promise<GalaxyOverview | null> {
		return fetchWithRetry<GalaxyOverview>(`${API_BASE}/api/v1/galaxy/overview`);
	}

	async fetchGalaxyStats(): Promise<GalaxyStats | null> {
		return fetchWithRetry<GalaxyStats>(`${API_BASE}/api/v1/galaxy/stats`);
	}

	async fetchRandomPuzzle(difficulty?: string): Promise<PuzzleDetail | null> {
		const params = difficulty ? `?difficulty=${difficulty}` : '';
		return fetchWithRetry<PuzzleDetail>(`${API_BASE}/api/v1/puzzles/random${params}`);
	}

	async submitMinedPuzzle(puzzle: MinedPuzzleInput, apiKey: string): Promise<MinedPuzzleResponse | null> {
		try {
			const resp = await fetch(`${API_BASE}/api/v1/internal/puzzles/mine`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Api-Key': apiKey
				},
				body: JSON.stringify(puzzle)
			});
			if (!resp.ok) return null;
			return (await resp.json()) as MinedPuzzleResponse;
		} catch {
			return null;
		}
	}
}

export const apiClient = new ApiClient();
