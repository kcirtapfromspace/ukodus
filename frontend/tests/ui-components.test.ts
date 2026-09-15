import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import PlayerTagModal from '../src/lib/components/PlayerTagModal.svelte';
import LeaderboardModal from '../src/lib/components/LeaderboardModal.svelte';
import ShareButton from '../src/lib/components/ShareButton.svelte';
import StatsBar from '../src/lib/components/StatsBar.svelte';
import TabControl from '../src/lib/components/TabControl.svelte';
import ThemeToggle from '../src/lib/components/ThemeToggle.svelte';
import Header from '../src/lib/components/Header.svelte';
import Footer from '../src/lib/components/Footer.svelte';
import SeoHead from '../src/lib/components/SeoHead.svelte';
import ErrorPage from '../src/routes/+error.svelte';
import { playerStore } from '../src/lib/stores/player.svelte';
import { themeStore } from '../src/lib/stores/theme.svelte';
import { apiClient } from '../src/lib/api/client';
import { posthogStore } from '../src/lib/stores/posthog.svelte';
import type { SudokuGame } from '../src/lib/wasm/loader';

vi.mock('$app/state', () => ({ page: { url: new URL('https://ukodus.now/play/'), status: 404, error: { message: 'Missing puzzle' } } }));
vi.mock('../src/lib/stores/posthog.svelte', () => ({ posthogStore: { captureEvent: vi.fn(), identifyPlayer: vi.fn() } }));

beforeEach(() => {
  playerStore.id = 'player-123';
  playerStore.tag = '';
  playerStore.secrets = false;
  themeStore.set('light');
  vi.spyOn(apiClient, 'registerShare').mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('player identity', () => {
  it('normalizes input, rejects a short tag, and saves a valid tag using Enter', async () => {
    const onclose = vi.fn();
    render(PlayerTagModal, { open: true, onclose });
    const input = screen.getByPlaceholderText('ACE');
    await fireEvent.input(input, { target: { value: 'a!' } });
    expect(input).toHaveValue('A');
    expect(screen.getByText('Too short — need at least 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'START' })).toBeDisabled();
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onclose).not.toHaveBeenCalled();
    await fireEvent.input(input, { target: { value: 'abc12' } });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onclose).toHaveBeenCalledWith('ABC12');
    expect(localStorage.getItem('ukodus_player_tag')).toBe('ABC12');
    expect(posthogStore.identifyPlayer).toHaveBeenCalledWith('player-123', 'ABC12');
  });

  it('reopens with the current tag and only displays while open', async () => {
    playerStore.tag = 'ACE';
    const onclose = vi.fn();
    const view = render(PlayerTagModal, { open: false, onclose });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await view.rerender({ open: true, onclose });
    expect(screen.getByRole('textbox')).toHaveValue('ACE');
    await fireEvent.click(screen.getByRole('button', { name: 'START' }));
    expect(onclose).toHaveBeenCalledWith('ACE');
  });
});

describe('leaderboard', () => {
  it('shows loading, formats ranked results, switches difficulty, and closes', async () => {
    let resolve!: (value: any) => void;
    vi.spyOn(apiClient, 'fetchLeaderboard').mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValue([]);
    const onclose = vi.fn();
    render(LeaderboardModal, { open: true, onclose });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolve([
      { player_id: playerStore.id, player_tag: 'ACE', time_secs: 125, hints_used: 1, mistakes: 0 },
      { player_id: 'abcdefghijk', player_tag: '', time_secs: 9, hints_used: 0, mistakes: 2 }
    ]);
    expect(await screen.findByText('ACE')).toBeInTheDocument();
    expect(screen.getByText('ACE').closest('tr')).toHaveClass('me');
    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByText('abcdefgh')).toBeInTheDocument();
    expect(screen.getByText('0:09')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Hard' }));
    await screen.findByText('No results yet for this difficulty.');
    expect(apiClient.fetchLeaderboard).toHaveBeenCalledWith({ difficulty: 'Hard', limit: 20 });
    await fireEvent.click(screen.getByRole('heading', { name: 'Leaderboard' }));
    expect(onclose).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('dialog'));
    expect(onclose).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onclose).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onclose).toHaveBeenCalledTimes(3);
  });

  it('handles a failed request and reveals unlocked difficulties', async () => {
    playerStore.secrets = true;
    vi.spyOn(apiClient, 'fetchLeaderboard').mockRejectedValue(new Error('offline'));
    render(LeaderboardModal, { open: true, onclose: vi.fn() });
    expect(await screen.findByText('Could not load leaderboard.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Master' }));
    expect(apiClient.fetchLeaderboard).toHaveBeenCalledWith({ difficulty: 'Master', limit: 20 });
  });
});

describe('sharing', () => {
  const game = (code = 'A1B2C3D4', puzzle = '1'.repeat(81)) => ({
    get_short_code: () => code, get_puzzle_string: () => puzzle,
    difficulty: () => 'Easy', se_rating: () => 2.3
  }) as SudokuGame;

  it('copies a registered short-code URL and restores the button label', async () => {
    vi.useFakeTimers();
    render(ShareButton, { game: game() });
    await fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${location.origin}/play/?s=A1B2C3D4`);
    expect(apiClient.registerShare).toHaveBeenCalledWith(expect.objectContaining({ short_code: 'A1B2C3D4', player_id: 'player-123', platform: 'web' }));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('uses native sharing when available and leaves cancellation alone', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    const view = render(ShareButton, { game: game() });
    await fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Shared!' })).toBeInTheDocument();
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sudoku Puzzle — Easy' }));
    view.unmount();
    share.mockRejectedValue(Object.assign(new Error('User cancelled'), { name: 'AbortError' }));
    render(ShareButton, { game: game() });
    await fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('falls back to document copy when clipboard permission is unavailable', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => true) });
    render(ShareButton, { game: game('', '2'.repeat(81)) });
    await fireEvent.click(screen.getByRole('button'));
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    expect(apiClient.registerShare).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });

  it.each([null, game('', '')])('does nothing without a shareable puzzle', async (puzzle) => {
    render(ShareButton, { game: puzzle });
    await fireEvent.click(screen.getByRole('button'));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(apiClient.registerShare).not.toHaveBeenCalled();
  });
});

it('refreshes stats, tolerates unavailable stats, and opens player controls', async () => {
  playerStore.tag = 'ACE';
  const get_stats_json = vi.fn().mockReturnValue(JSON.stringify({ games_played: 4, games_won: 3, current_streak: 2, best_time: 125 }));
  const ontagclick = vi.fn(), onleaderboard = vi.fn();
  const { component } = render(StatsBar, { game: { get_stats_json } as unknown as SudokuGame, ontagclick, onleaderboard });
  component.refresh();
  await tick();
  expect(screen.getByText('75%')).toBeInTheDocument();
  expect(screen.getByText('2:05')).toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'ACE' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Leaderboard' }));
  expect(ontagclick).toHaveBeenCalledOnce();
  expect(onleaderboard).toHaveBeenCalledOnce();
  get_stats_json.mockReturnValue('{broken');
  expect(() => component.refresh()).not.toThrow();
  get_stats_json.mockReturnValue(JSON.stringify({ games_played: 0, best_time: 999999 }));
  component.refresh();
  await tick();
  expect(screen.getByText('--:--')).toBeInTheDocument();
  expect(screen.getByText('0%')).toBeInTheDocument();
});

it('supports cyclic keyboard navigation of tabs and ignores unrelated keys', async () => {
  const onselect = vi.fn();
  render(TabControl, { tabs: [{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }], activeTab: 'one', onselect });
  expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
  await fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'ArrowLeft' });
  expect(onselect).toHaveBeenLastCalledWith('two');
  await fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'ArrowRight' });
  expect(onselect).toHaveBeenLastCalledWith('one');
  await fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'x' });
  expect(onselect).toHaveBeenCalledTimes(2);
  await fireEvent.click(screen.getByRole('tab', { name: 'Two' }));
  expect(onselect).toHaveBeenLastCalledWith('two');
});

it('cycles through accessible theme names and records the selected theme', async () => {
  render(ThemeToggle);
  await fireEvent.click(screen.getByRole('button', { name: 'Toggle theme: light' }));
  expect(screen.getByRole('button', { name: 'Toggle theme: dark' })).toHaveTextContent('Dark');
  await fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('Hi-Con');
  expect(posthogStore.captureEvent).toHaveBeenLastCalledWith('theme_changed', { theme: 'high-contrast' });
});

it('renders active navigation and footer destinations', () => {
  const header = render(Header);
  expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  header.unmount();
  render(Footer);
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy/');
  expect(screen.getByText(`© ${new Date().getFullYear()} Ukodus`)).toBeInTheDocument();
});

it('renders canonical SEO metadata and both single and multiple schema objects', async () => {
  const props = { title: 'Puzzle guide', description: 'Learn Sudoku', url: 'https://ukodus.now/guide/' };
  const view = render(SeoHead, { ...props, jsonLd: { '@type': 'Article', name: 'Guide' } });
  expect(document.title).toBe('Puzzle guide');
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', props.url);
  expect(JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)).toEqual({ '@type': 'Article', name: 'Guide' });
  await view.rerender({ ...props, jsonLd: [{ '@type': 'WebSite' }, { '@type': 'FAQPage' }] });
  expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
});

it('marks the error page as noindex and links back to a playable puzzle', () => {
  render(ErrorPage);
  expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  expect(screen.getByText(/This page doesn't exist/)).toBeInTheDocument();
  expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  expect(screen.getByRole('link', { name: 'Play Sudoku' })).toHaveAttribute('href', '/play/');
});
