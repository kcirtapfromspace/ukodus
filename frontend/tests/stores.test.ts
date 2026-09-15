import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({ default: { init: vi.fn(), capture: vi.fn(), identify: vi.fn() } }));
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('../src/lib/api/client', () => ({ apiClient: { fetchGalaxyOverview: vi.fn(), fetchGalaxyStats: vi.fn() } }));

beforeEach(() => { vi.resetModules(); localStorage.clear(); document.body.className = ''; delete window.__RUNTIME_CONFIG__; });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('creates and persists player identity, tag and secret preferences across store reloads', async () => {
 let { playerStore } = await import('../src/lib/stores/player.svelte');
 const id = playerStore.id;
 expect(id).toMatch(/^[\da-f-]{36}$/);
 playerStore.setTag('Ada'); playerStore.setSecrets(true);
 expect(document.body).toHaveClass('secrets-unlocked');
 vi.resetModules(); ({ playerStore } = await import('../src/lib/stores/player.svelte'));
 expect([playerStore.id, playerStore.tag, playerStore.secrets]).toEqual([id, 'Ada', true]);
 playerStore.setSecrets(false);
 expect(document.body).not.toHaveClass('secrets-unlocked');
 expect(localStorage.getItem('ukodus_secrets')).toBe('0');
});

it('supports identity generation without crypto.randomUUID', async () => {
 vi.stubGlobal('crypto', {});
 const { playerStore } = await import('../src/lib/stores/player.svelte');
 expect(playerStore.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});

it('restores only supported themes, cycles all themes and applies explicit choices', async () => {
 localStorage.setItem('ukodus_theme', 'invalid');
 let { themeStore } = await import('../src/lib/stores/theme.svelte');
 expect(themeStore.current).toBe('light');
 for (const expected of ['dark', 'high-contrast', 'light']) {
  themeStore.cycle();
  expect(document.documentElement).toHaveAttribute('data-theme', expected);
  expect(localStorage.getItem('ukodus_theme')).toBe(expected);
 }
 themeStore.set('high-contrast'); vi.resetModules();
 ({ themeStore } = await import('../src/lib/stores/theme.svelte'));
 expect(themeStore.current).toBe('high-contrast');
});

it('round-trips game state, stats and secrets and formats statistics', async () => {
 const { gameStore } = await import('../src/lib/stores/game.svelte');
 expect(gameStore.loadSavedState()).toBeNull(); expect(gameStore.loadSavedStats()).toBeNull();
 expect(gameStore.winPercent).toBe(0); expect(gameStore.bestTimeFormatted).toBe('--:--');
 const stats = JSON.stringify({ games_played: 3, games_won: 2, current_streak: 2, best_time: 125 });
 gameStore.saveState({ get_state_json: () => '{"puzzle":"saved"}', get_stats_json: () => stats, is_secrets_unlocked: () => true });
 expect(gameStore.loadSavedState()).toBe('{"puzzle":"saved"}'); expect(gameStore.loadSavedStats()).toBe(stats);
 expect(localStorage.getItem('ukodus_secrets')).toBe('1');
 gameStore.updateStats(stats);
 expect(gameStore.winPercent).toBe(67); expect(gameStore.bestTimeFormatted).toBe('2:05');
 gameStore.updateStats('broken'); expect(gameStore.stats.games_played).toBe(3);
 gameStore.updateStats('{}'); expect(gameStore.stats).toEqual({ games_played: 0, games_won: 0, current_streak: 0, best_time: 999999 });
 gameStore.saveState({ get_state_json: () => 'state', get_stats_json: () => '{}', is_secrets_unlocked: () => false });
 expect(localStorage.getItem('ukodus_secrets')).toBe('0');
});

it('does not interrupt gameplay when saving or optional WASM preferences fail', async () => {
 const { gameStore } = await import('../src/lib/stores/game.svelte');
 const game = { get_state_json: () => 'state', get_stats_json: () => '{}', is_secrets_unlocked: () => { throw new Error('old WASM'); } };
 expect(() => gameStore.saveState(game)).not.toThrow();
 expect(localStorage.getItem('sudoku_save')).toBe('state');
 gameStore.saveState({ get_state_json: () => 'other', get_stats_json: () => '{}' });
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
 expect(() => gameStore.saveState(game)).not.toThrow();
});

it('only initializes analytics with configuration and captures events after initialization', async () => {
 const { posthogStore } = await import('../src/lib/stores/posthog.svelte');
 const { default: posthog } = await import('posthog-js');
 posthogStore.init(); posthogStore.capturePageView('/play'); posthogStore.captureEvent('game'); posthogStore.identifyPlayer('id');
 expect(posthog.init).not.toHaveBeenCalled(); expect(posthog.capture).not.toHaveBeenCalled(); expect(posthog.identify).not.toHaveBeenCalled();
 window.__RUNTIME_CONFIG__ = { POSTHOG_KEY: 'test-key' }; posthogStore.init(); posthogStore.init();
 expect(posthog.init).toHaveBeenCalledExactlyOnceWith('test-key', expect.objectContaining({ api_host: 'https://us.i.posthog.com', capture_pageview: false }));
 posthogStore.capturePageView('/galaxy'); posthogStore.captureEvent('game', { won: true });
 posthogStore.identifyPlayer('id'); posthogStore.identifyPlayer('id', 'Ada');
 expect(posthog.capture).toHaveBeenCalledWith('$pageview', { $current_url: '/galaxy' });
 expect(posthog.capture).toHaveBeenCalledWith('game', { won: true });
 expect(posthog.identify).toHaveBeenCalledWith('id', undefined);
 expect(posthog.identify).toHaveBeenCalledWith('id', { player_tag: 'Ada' });
 vi.resetModules(); window.__RUNTIME_CONFIG__ = { POSTHOG_KEY: 'key2', POSTHOG_HOST: 'https://analytics.example' };
 (await import('../src/lib/stores/posthog.svelte')).posthogStore.init();
 expect(posthog.init).toHaveBeenLastCalledWith('key2', expect.objectContaining({ api_host: 'https://analytics.example' }));
});
