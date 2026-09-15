import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import GameCanvas from '../src/lib/game/GameCanvas.svelte';
import PlayPage from '../src/routes/play/+page.svelte';
import { themeStore } from '../src/lib/stores/theme.svelte';
import { playerStore } from '../src/lib/stores/player.svelte';

const services = vi.hoisted(() => ({
  loadWasm: vi.fn(), bridgeStart: vi.fn(), bridgeStop: vi.fn(), bridgeReset: vi.fn(),
  warmup: vi.fn(), take: vi.fn(), get: vi.fn(), destroy: vi.fn(),
  fetchRandomPuzzle: vi.fn(), fetchLeaderboard: vi.fn(), miningStart: vi.fn(), miningStop: vi.fn(),
  captureEvent: vi.fn(), game: null as any
}));
vi.mock('../src/lib/wasm/loader', () => ({ loadWasm: services.loadWasm }));
vi.mock('../src/lib/game/GameBridge', () => ({ GameBridge: class {
  start = services.bridgeStart;
  stop = services.bridgeStop;
  reset = services.bridgeReset;
} }));
vi.mock('../src/lib/wasm/puzzle-prefetch', () => ({ puzzlePrefetch: {
  warmup: services.warmup, take: services.take, get: services.get, destroy: services.destroy
} }));
vi.mock('../src/lib/wasm/mining-coordinator', () => ({ miningCoordinator: { start: services.miningStart, stop: services.miningStop } }));
vi.mock('../src/lib/api/client', () => ({ apiClient: { fetchRandomPuzzle: services.fetchRandomPuzzle, fetchLeaderboard: services.fetchLeaderboard } }));
vi.mock('../src/lib/stores/posthog.svelte', () => ({ posthogStore: { captureEvent: services.captureEvent, identifyPlayer: vi.fn() } }));

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const settle = async () => { await tick(); await Promise.resolve(); await tick(); await Promise.resolve(); await tick(); };
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => { frames.set(++nextFrame, callback); return nextFrame; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => { frames.delete(id); }));
  localStorage.clear();
  window.history.replaceState({}, '', '/play/');
  themeStore.set('light');
  playerStore.tag = 'ACE';
  playerStore.secrets = false;
  services.game = {
    resize: vi.fn(), set_theme: vi.fn(), load_short_code: vi.fn(), load_puzzle_string: vi.fn(),
    load_state_json: vi.fn(), difficulty: vi.fn(() => 'Medium'), load_stats_json: vi.fn(),
    set_secrets_unlocked: vi.fn(), handle_key: vi.fn(), take_pending_difficulty: vi.fn(() => ''),
    screen_state: vi.fn(() => 'Playing'), load_pregenerated: vi.fn(), new_game: vi.fn(), tick: vi.fn(),
    get_state_json: vi.fn(() => '{"state":"saved"}'), get_stats_json: vi.fn(() => '{}'),
    is_secrets_unlocked: vi.fn(() => false)
  };
  services.loadWasm.mockResolvedValue({ SudokuGame: class { constructor() { return services.game; } } });
  services.take.mockReturnValue(null);
  services.get.mockResolvedValue(null);
  services.fetchRandomPuzzle.mockResolvedValue(null);
  services.fetchLeaderboard.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('restores saved progress and stats, starts services, and saves before unload', async () => {
  localStorage.setItem('sudoku_save', 'saved-game');
  localStorage.setItem('sudoku_stats', 'saved-stats');
  playerStore.secrets = true;
  const onready = vi.fn();
  render(GameCanvas, { onready });
  expect(screen.getByText('Loading Sudoku')).toBeInTheDocument();
  await settle();
  expect(screen.queryByText('Loading Sudoku')).not.toBeInTheDocument();
  expect(services.game.load_state_json).toHaveBeenCalledWith('saved-game');
  expect(services.game.load_stats_json).toHaveBeenCalledWith('saved-stats');
  expect(services.game.set_secrets_unlocked).toHaveBeenCalledWith(true);
  expect(services.warmup).toHaveBeenCalledWith('medium');
  expect(onready).toHaveBeenCalledWith(services.game);
  expect(services.bridgeStart).toHaveBeenCalledOnce();
  expect(services.miningStart).toHaveBeenCalledOnce();
  const [firstFrame, callback] = frames.entries().next().value!;
  frames.delete(firstFrame);
  callback(16);
  expect(services.game.resize).toHaveBeenCalledTimes(2);
  await fireEvent(window, new Event('beforeunload'));
  expect(localStorage.getItem('sudoku_save')).toBe('{"state":"saved"}');
  expect(localStorage.getItem('sudoku_stats')).toBe('{}');
});

it.each([
  ['?s=ABCD1234', 'load_short_code', 'ABCD1234'],
  [`?p=${'1'.repeat(81)}`, 'load_puzzle_string', '1'.repeat(81)],
  ['?s=bad', 'load_state_json', 'existing-save']
])('loads incoming puzzle URLs: %s', async (query, method, argument) => {
  window.history.replaceState({}, '', `/play/${query}`);
  localStorage.setItem('sudoku_save', 'existing-save');
  render(GameCanvas, { onready: vi.fn() });
  await settle();
  expect(services.game[method]).toHaveBeenCalledWith(argument);
});

it('tolerates corrupt saved data and optional prefetch failures', async () => {
  localStorage.setItem('sudoku_save', 'bad');
  localStorage.setItem('sudoku_stats', 'bad');
  services.game.load_state_json.mockImplementation(() => { throw new Error('corrupt'); });
  services.game.load_stats_json.mockImplementation(() => { throw new Error('corrupt'); });
  services.warmup.mockImplementation(() => { throw new Error('worker unavailable'); });
  const onready = vi.fn();
  render(GameCanvas, { onready });
  await settle();
  expect(onready).toHaveBeenCalled();
  expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
});

it('routes keys to the engine, suppresses browser game shortcuts, and respects modals', async () => {
  render(GameCanvas, { onready: vi.fn() });
  await settle();
  const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
  window.dispatchEvent(arrow);
  expect(arrow.defaultPrevented).toBe(true);
  expect(services.game.handle_key).toHaveBeenCalledWith(arrow);
  const ordinary = new KeyboardEvent('keydown', { key: 'z', cancelable: true });
  window.dispatchEvent(ordinary);
  expect(ordinary.defaultPrevented).toBe(false);
  const reload = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, cancelable: true });
  window.dispatchEvent(reload);
  expect(reload.defaultPrevented).toBe(true);
  const overlay = document.createElement('div');
  overlay.className = 'tag-overlay';
  document.body.appendChild(overlay);
  services.game.handle_key.mockClear();
  await fireEvent.keyDown(window, { key: '1' });
  expect(services.game.handle_key).not.toHaveBeenCalled();
  overlay.remove();
});

it('keeps the engine and page background in sync when the theme changes after loading', async () => {
  const layout = document.createElement('div');
  layout.id = 'game-container';
  document.body.appendChild(layout);
  render(GameCanvas, { onready: vi.fn() });
  await settle();
  themeStore.set('dark');
  await settle();
  expect(services.game.set_theme).toHaveBeenLastCalledWith('dark');
  expect(document.body.style.background).toBe('rgb(24, 24, 42)');
  themeStore.set('high-contrast');
  await settle();
  expect(services.game.set_theme).toHaveBeenLastCalledWith('high_contrast');
  expect(layout.style.background).toBe('rgb(0, 0, 0)');
  themeStore.set('light');
  await settle();
  expect(layout.style.background).toBe('');
  layout.remove();
});

it('debounces resizes and removes listeners, pending work and services on unmount', async () => {
  const view = render(GameCanvas, { onready: vi.fn() });
  await settle();
  services.game.resize.mockClear();
  await fireEvent(window, new Event('resize'));
  await fireEvent(window, new Event('resize'));
  await vi.advanceTimersByTimeAsync(100);
  expect(services.game.resize).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(localStorage.getItem('sudoku_save')).toBe('{"state":"saved"}');
  expect(localStorage.getItem('sudoku_stats')).toBe('{}');
  expect(localStorage.getItem('ukodus_secrets')).toBe('0');
  expect(services.bridgeStop).toHaveBeenCalledOnce();
  expect(services.destroy).toHaveBeenCalledOnce();
  expect(services.miningStop).toHaveBeenCalledOnce();
  expect(cancelAnimationFrame).toHaveBeenCalled();
  services.game.resize.mockClear();
  services.game.get_state_json.mockClear();
  await fireEvent(window, new Event('resize'));
  await fireEvent(window, new Event('beforeunload'));
  await vi.advanceTimersByTimeAsync(100);
  expect(services.game.resize).not.toHaveBeenCalled();
  expect(services.game.get_state_json).not.toHaveBeenCalled();
});

it('always releases gameplay resources when persisting progress fails during navigation', async () => {
  const view = render(GameCanvas, { onready: vi.fn() });
  await settle();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  services.game.get_state_json.mockClear();
  expect(() => view.unmount()).not.toThrow();
  expect(services.game.get_state_json).toHaveBeenCalledOnce();
  expect(services.bridgeStop).toHaveBeenCalledOnce();
  expect(services.destroy).toHaveBeenCalledOnce();
  expect(services.miningStop).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  services.game.get_state_json.mockClear();
  await fireEvent(window, new Event('beforeunload'));
  expect(services.game.get_state_json).not.toHaveBeenCalled();
});

it('does not initialize a game after the component was removed during WASM loading', async () => {
  let resolve!: (value: unknown) => void;
  services.loadWasm.mockReturnValue(new Promise((done) => { resolve = done; }));
  const onready = vi.fn();
  const view = render(GameCanvas, { onready });
  view.unmount();
  resolve({ SudokuGame: class { constructor() { return services.game; } } });
  await settle();
  expect(onready).not.toHaveBeenCalled();
  expect(services.bridgeStart).not.toHaveBeenCalled();
});

it('reports initialization errors without starting services', async () => {
  services.loadWasm.mockRejectedValue(new Error('Missing WASM'));
  render(GameCanvas, { onready: vi.fn() });
  await settle();
  expect(screen.getByText('Failed to load: Missing WASM')).toBeInTheDocument();
  expect(services.bridgeStart).not.toHaveBeenCalled();
});

describe('new puzzle generation', () => {
  it.each(['cache', 'sync'])('keeps the %s puzzle playable when background warmup fails', async (source) => {
    const puzzle = { puzzle_string: '9'.repeat(81), solution_string: 'solution' };
    services.warmup.mockImplementation(() => { throw new Error('Worker unavailable'); });
    if (source === 'cache') services.take.mockReturnValue(puzzle);
    services.game.screen_state.mockReturnValue('Loading');
    services.game.take_pending_difficulty.mockReturnValueOnce('Hard').mockReturnValue('');
    const onready = vi.fn();
    render(GameCanvas, { onready });
    await settle();
    expect(onready).toHaveBeenCalled();
    if (source === 'cache') {
      expect(services.game.load_pregenerated).toHaveBeenCalledWith(JSON.stringify(puzzle));
      expect(services.game.new_game).not.toHaveBeenCalled();
    } else {
      expect(services.game.new_game).toHaveBeenCalledWith('hard');
    }
  });

  it('does not start a worker when an API request finishes after leaving the game', async () => {
    let resolve!: (value: unknown) => void;
    services.fetchRandomPuzzle.mockReturnValue(new Promise((done) => { resolve = done; }));
    services.game.screen_state.mockReturnValue('Loading');
    services.game.take_pending_difficulty.mockReturnValueOnce('Hard').mockReturnValue('');
    const view = render(GameCanvas, { onready: vi.fn() });
    await settle();
    expect(services.fetchRandomPuzzle).toHaveBeenCalledWith('hard');
    view.unmount();
    resolve(null);
    await settle();
    expect(services.get).not.toHaveBeenCalled();
    expect(services.game.new_game).not.toHaveBeenCalled();
  });

  it.each(['cache', 'api', 'worker', 'sync', 'api-error'])('uses the %s path', async (source) => {
    const puzzle = { puzzle_string: '9'.repeat(81), solution_string: 'solution' };
    if (source === 'cache') services.take.mockReturnValue(puzzle);
    if (source === 'api') services.fetchRandomPuzzle.mockResolvedValue(puzzle);
    if (source === 'worker') services.get.mockResolvedValue(puzzle);
    if (source === 'api-error') services.fetchRandomPuzzle.mockRejectedValue(new Error('offline'));
    services.game.screen_state.mockReturnValue('Loading');
    services.game.take_pending_difficulty.mockReturnValueOnce('Hard').mockReturnValue('');
    render(GameCanvas, { onready: vi.fn() });
    await settle();
    if (source === 'cache' || source === 'worker') {
      expect(services.game.load_pregenerated).toHaveBeenCalledWith(JSON.stringify(puzzle));
      expect(services.game.new_game).not.toHaveBeenCalled();
    } else if (source === 'api') {
      expect(services.game.load_puzzle_string).toHaveBeenCalledWith(puzzle.puzzle_string);
      expect(services.get).not.toHaveBeenCalled();
    } else {
      expect(services.game.new_game).toHaveBeenCalledWith('hard');
    }
    expect(services.warmup).toHaveBeenCalledWith('hard');
  });
});

it('opens and dismisses gameplay dialogs and clears the periodic stats refresh when leaving', async () => {
  const interval = vi.spyOn(globalThis, 'setInterval');
  const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
  playerStore.tag = '';
  const view = render(PlayPage);
  await settle();
  expect(screen.getByRole('heading', { name: 'Enter Your Tag' })).toBeInTheDocument();
  await fireEvent.input(screen.getByRole('textbox'), { target: { value: 'ace' } });
  await fireEvent.click(screen.getByRole('button', { name: 'START' }));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'ACE' }));
  expect(screen.getByRole('textbox')).toHaveValue('ACE');
  await fireEvent.click(screen.getByRole('button', { name: 'START' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(interval).toHaveBeenCalledWith(expect.any(Function), 5000);
  view.unmount();
  expect(clearIntervalSpy).toHaveBeenCalledWith(interval.mock.results[0].value);
  services.game.get_stats_json.mockClear();
  await vi.advanceTimersByTimeAsync(10000);
  expect(services.game.get_stats_json).not.toHaveBeenCalled();
});
