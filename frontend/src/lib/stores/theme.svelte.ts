export type Theme = 'light' | 'dark' | 'high-contrast';

const THEME_KEY = 'ukodus_theme';
const CYCLE: Theme[] = ['light', 'dark', 'high-contrast'];

class ThemeStore {
	current = $state<Theme>('light');

	constructor() {
		if (typeof window === 'undefined') return;
		const saved = localStorage.getItem(THEME_KEY) as Theme | null;
		if (saved && CYCLE.includes(saved)) {
			this.current = saved;
		}
		this.apply();
	}

	cycle() {
		const idx = CYCLE.indexOf(this.current);
		this.current = CYCLE[(idx + 1) % CYCLE.length];
		localStorage.setItem(THEME_KEY, this.current);
		this.apply();
	}

	set(theme: Theme) {
		this.current = theme;
		localStorage.setItem(THEME_KEY, theme);
		this.apply();
	}

	private apply() {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', this.current);
	}
}

export const themeStore = new ThemeStore();
