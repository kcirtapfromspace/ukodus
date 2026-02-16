const SAVE_KEY = 'sudoku_save';
const STATS_KEY = 'sudoku_stats';
const SECRETS_KEY = 'ukodus_secrets';

export interface GameStats {
	games_played: number;
	games_won: number;
	current_streak: number;
	best_time: number;
}

class GameStore {
	stats = $state<GameStats>({
		games_played: 0,
		games_won: 0,
		current_streak: 0,
		best_time: 999999
	});

	saveState(game: { get_state_json(): string; get_stats_json(): string; is_secrets_unlocked?(): boolean }) {
		try {
			localStorage.setItem(SAVE_KEY, game.get_state_json());
			localStorage.setItem(STATS_KEY, game.get_stats_json());
			try {
				if (game.is_secrets_unlocked) {
					localStorage.setItem(SECRETS_KEY, game.is_secrets_unlocked() ? '1' : '0');
				}
			} catch { /* method not available */ }
		} catch { /* save failed */ }
	}

	loadSavedState(): string | null {
		return localStorage.getItem(SAVE_KEY);
	}

	loadSavedStats(): string | null {
		return localStorage.getItem(STATS_KEY);
	}

	updateStats(raw: string) {
		try {
			const parsed = JSON.parse(raw);
			this.stats = {
				games_played: parsed.games_played || 0,
				games_won: parsed.games_won || 0,
				current_streak: parsed.current_streak || 0,
				best_time: parsed.best_time || 999999
			};
		} catch { /* invalid stats */ }
	}

	get winPercent(): number {
		if (this.stats.games_played === 0) return 0;
		return Math.round((this.stats.games_won / this.stats.games_played) * 100);
	}

	get bestTimeFormatted(): string {
		if (!this.stats.best_time || this.stats.best_time >= 999999) return '--:--';
		const m = Math.floor(this.stats.best_time / 60);
		const s = this.stats.best_time % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}
}

export const gameStore = new GameStore();
