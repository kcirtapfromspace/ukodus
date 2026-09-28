import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import * as d3 from 'd3';
import GalaxyGraph from '../src/lib/galaxy/GalaxyGraph.svelte';
import GalaxyDetail from '../src/lib/galaxy/GalaxyDetail.svelte';
import GalaxyFilters from '../src/lib/galaxy/GalaxyFilters.svelte';
import GalaxyStats from '../src/lib/galaxy/GalaxyStats.svelte';
import TechniqueStarKey from '../src/lib/galaxy/TechniqueStarKey.svelte';
import GalaxyPage from '../src/routes/galaxy/+page.svelte';
import { galaxyStore, TECHNIQUE_FAMILIES } from '../src/lib/stores/galaxy.svelte';
import { playerStore } from '../src/lib/stores/player.svelte';
import { apiClient } from '../src/lib/api/client';
import { posthogStore } from '../src/lib/stores/posthog.svelte';
import type { GalaxyNode } from '../src/lib/api/types';

vi.mock('../src/lib/stores/posthog.svelte', () => ({ posthogStore: { captureEvent: vi.fn() } }));

const node = (id: string, technique = 'NakedSingle', extras: Partial<GalaxyNode> = {}) => ({
  id, puzzle_hash: id, short_code: `CODE${id}`, puzzle_string: '1'.repeat(81),
  difficulty: 'Easy', se_rating: 2.3, techniques: [technique],
  play_count: 4, avg_time_secs: 125, ...extras
}) as GalaxyNode;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  // jsdom has no SVG layout; supply the dimensions and zoom viewport of a browser.
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  Object.defineProperty(SVGSVGElement.prototype, 'width', { configurable: true, value: { baseVal: { value: 800 } } });
  Object.defineProperty(SVGSVGElement.prototype, 'height', { configurable: true, value: { baseVal: { value: 600 } } });
  galaxyStore.nodes = [];
  galaxyStore.edges = [];
  galaxyStore.stats = null;
  galaxyStore.selectedNode = null;
  galaxyStore.focusedFamily = null;
  galaxyStore.focusedTechnique = null;
  galaxyStore.loading = false;
  galaxyStore.error = '';
  galaxyStore.activeFilters = new Set(Object.keys(TECHNIQUE_FAMILIES));
  playerStore.secrets = false;
  vi.spyOn(galaxyStore, 'fetchData').mockResolvedValue(undefined);
  vi.spyOn(galaxyStore, 'connectWebSocket').mockImplementation(() => {});
  vi.spyOn(galaxyStore, 'disconnectWebSocket').mockImplementation(() => {});
  vi.spyOn(apiClient, 'fetchLeaderboard').mockResolvedValue([]);
});
afterEach(() => {
  d3.selectAll('svg').interrupt();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('shows one illustrative galactic nucleus independently of puzzle volume and keeps stars playable', async () => {
 galaxyStore.nodes = [node('one')];
 const {container} = render(GalaxyGraph);
 await waitFor(() => expect(container.querySelectorAll('.galaxy-node')).toHaveLength(1));
 expect(container.querySelector('.black-hole-system')).toHaveAttribute('aria-hidden', 'true');
 galaxyStore.nodes = Array.from({length: 101}, (_, i) => node(`mass-${i}`));
 await tick();
 expect(container.querySelectorAll('.black-hole-system')).toHaveLength(1);
 expect(container.querySelectorAll('.galaxy-node')).toHaveLength(101);
 await fireEvent.click(container.querySelector('.galaxy-node')!);
 expect(screen.getByRole('link', {name: 'Play This Puzzle'})).toHaveAttribute('href', expect.stringContaining('/play/'));
 galaxyStore.toggleFilter('singles');
 await tick();
 expect(container.querySelector('.black-hole-system')).not.toBeInTheDocument();
});

it('shows an empty detail prompt, then a linked puzzle and its formatted best times', async () => {
  render(GalaxyDetail);
  expect(screen.getByText('Click a node to see details')).toBeInTheDocument();
  vi.mocked(apiClient.fetchLeaderboard).mockResolvedValue([
    { player_id: 'abcdefghijk', player_tag: 'ACE', time_secs: 65, hints_used: 1, mistakes: 2 },
    { player_id: 'ijklmnopqrst', player_tag: '', time_secs: 0, hints_used: 0, mistakes: 0 }
  ] as any);
  galaxyStore.selectNode(node('ABCD', 'NakedSingle', { short_code: 'AB&CD' }));
  await tick();
  expect(screen.getByRole('link', { name: 'Play This Puzzle' })).toHaveAttribute('href', '/play/?s=AB%26CD&from=galaxy');
  expect(screen.getByText('2:05')).toBeInTheDocument();
  expect(await screen.findByText('ACE')).toBeInTheDocument();
  expect(screen.getByText('1:05')).toBeInTheDocument();
  expect(screen.getByText('ijklmnop')).toBeInTheDocument();
  expect(apiClient.fetchLeaderboard).toHaveBeenCalledWith({ puzzle_hash: 'ABCD', limit: 10 });
});

it('ignores a stale leaderboard response when the selected puzzle changes', async () => {
  let resolveOld!: (value: any) => void;
  vi.mocked(apiClient.fetchLeaderboard).mockReturnValueOnce(new Promise((done) => { resolveOld = done; })).mockResolvedValue([]);
  galaxyStore.selectNode(node('old'));
  render(GalaxyDetail);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  galaxyStore.selectNode(node('new', 'NakedSingle', { short_code: '', avg_time_secs: 0, techniques: [] }));
  expect(await screen.findByText('No completions yet')).toBeInTheDocument();
  resolveOld([{ player_tag: 'STALE', time_secs: 999 }]);
  await tick();
  expect(screen.queryByText('STALE')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Play This Puzzle' })).toHaveAttribute('href', `/play/?p=${'1'.repeat(81)}&from=galaxy`);
});

it('handles leaderboard failure for a selected puzzle', async () => {
  vi.mocked(apiClient.fetchLeaderboard).mockRejectedValue(new Error('offline'));
  galaxyStore.selectNode(node('broken'));
  render(GalaxyDetail);
  expect(await screen.findByText('Could not load times. Please try again later.')).toBeInTheDocument();
});

it('filters families independently of technique navigation and returns to all families', async () => {
  galaxyStore.nodes = [node('1'), node('2'), node('3', 'HiddenSingle'), node('4', 'XWing'), node('5', 'Arithmetic Counting')];
  render(GalaxyFilters);
  expect(screen.queryByRole('button', { name: 'Chains' })).not.toBeInTheDocument();
  const singleCheckbox = screen.getByRole('checkbox', { name: /Singles/ });
  expect(singleCheckbox).toBeChecked();
  await fireEvent.click(singleCheckbox);
  expect(galaxyStore.activeFilters.has('singles')).toBe(false);
  await fireEvent.click(screen.getByRole('button', { name: 'Singles' }));
  expect(galaxyStore.activeFilters.has('singles')).toBe(false);
  expect(galaxyStore.focusedFamily).toBe('singles');
  expect(screen.getByText('NakedSingle').parentElement).toHaveTextContent('2');
  expect(screen.getByText('HiddenSingle').parentElement).toHaveTextContent('1');
  await fireEvent.click(screen.getByRole('button', { name: /Singles/ }));
  expect(screen.getByRole('heading', { name: 'Technique Filters' })).toBeInTheDocument();
  playerStore.secrets = true;
  await tick();
  await fireEvent.click(screen.getByRole('button', { name: 'Chains' }));
  expect(galaxyStore.focusedFamily).toBe('chains');
  await fireEvent.click(screen.getByRole('button', { name: /Chains/ }));
  await fireEvent.click(screen.getByRole('button', { name: 'Other' }));
  expect(screen.getByText('ArithmeticCounting').parentElement).toHaveTextContent('1');
});

it('shows aggregate counts and counts each observed visible technique once', async () => {
  galaxyStore.nodes = [node('1'), node('2'), node('3', 'XChain'), node('4', 'Arithmetic Counting'), node('5', 'ArithmeticCounting')];
  galaxyStore.stats = { total_puzzles: 1234, total_plays: 9876 } as any;
  const view = render(GalaxyStats);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('9,876')).toBeInTheDocument();
  expect(view.container.querySelectorAll('.stat-value')[2]).toHaveTextContent(/^1 \/ /);
  playerStore.secrets = true;
  await tick();
  expect(view.container.querySelectorAll('.stat-value')[2]).toHaveTextContent(/^3 \/ 46$/);
});

it('renders the empty galaxy page and initializes unlocked families', async () => {
  playerStore.secrets = true;
  const init = vi.spyOn(galaxyStore, 'initWithSecrets');
  render(GalaxyPage);
  expect(await screen.findByText('No puzzles in the galaxy yet.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Play Now/ })).toHaveAttribute('href', '/play/');
  expect(init).toHaveBeenCalledWith(true);
  expect(document.title).toBe('Sudoku Galaxy — Ukodus');
});


it('renders real puzzle stars and connects them without moving them during family exploration', async () => {
  galaxyStore.nodes = [node('a'), node('b'), node('c', 'HiddenSingle'), node('d', 'XWing')];
  galaxyStore.edges = [{ source: 'a', target: 'b', similarity: .8 }];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(4));
  const star = view.container.querySelector('.galaxy-node')!;
  const x = star.getAttribute('cx'), y = star.getAttribute('cy');
  expect(view.container.querySelector('.galaxy-edge')).toBeInTheDocument();
  expect(view.container.querySelector('.cluster-hull')).not.toBeInTheDocument();
  await fireEvent.mouseOver(star, { clientX: 50, clientY: 100 });
  expect(screen.getByText('CODEa')).toBeInTheDocument();
  expect(view.container.querySelector('.galaxy-tooltip')).toHaveTextContent('2.3');
  await fireEvent.mouseOut(star);
  expect(view.container.querySelector('.galaxy-tooltip')).not.toBeInTheDocument();
  await fireEvent.click(star);
  expect(galaxyStore.selectedNode?.id).toBe('a');
  expect(posthogStore.captureEvent).toHaveBeenCalledWith('galaxy_node_clicked', { puzzle_hash: 'a' });
  expect(screen.getByRole('link', { name: 'Play This Puzzle' })).toHaveAttribute('href', '/play/?s=CODEa&from=galaxy');
  await fireEvent.click(screen.getByRole('button', { name: 'Close puzzle details' }));
  expect(galaxyStore.selectedNode).toBeNull();
  expect(star).toHaveFocus();
  await fireEvent.click(screen.getByRole('button', { name: 'Explore Singles constellation' }));
  expect(galaxyStore.focusedFamily).toBe('singles');
  expect(view.container.querySelectorAll('.dimmed-family')).toHaveLength(1);
  expect(star).toHaveAttribute('cx', x);
  expect(star).toHaveAttribute('cy', y);
  await fireEvent.click(screen.getByRole('button', { name: '← All constellations' }));
  expect(galaxyStore.focusedFamily).toBeNull();
  view.unmount();
  expect(galaxyStore.disconnectWebSocket).toHaveBeenCalledOnce();
});

it('moves keyboard focus between visible stars and selects with Enter', async () => {
  galaxyStore.nodes = [node('one'), node('two', 'XWing'), node('three')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(3));
  const [one, two, three] = [...view.container.querySelectorAll<SVGCircleElement>('.galaxy-node')];
  expect(one).toHaveAttribute('tabindex', '0');
  await fireEvent.keyDown(one, { key: 'ArrowRight' });
  expect(two).toHaveFocus();
  await fireEvent.keyDown(two, { key: 'Enter' });
  expect(galaxyStore.selectedNode?.id).toBe('two');
  galaxyStore.toggleFilter('fish');
  await tick();
  expect(two).toHaveAttribute('tabindex', '-1');
  expect(two).toHaveAttribute('aria-hidden', 'true');
  await fireEvent.keyDown(one, { key: 'ArrowRight' });
  expect(three).toHaveFocus();
  await fireEvent.keyDown(three, { key: 'Escape' });
  expect(galaxyStore.selectedNode).toBeNull();
});

it('zooms and fits the visible puzzles inside the viewport', async () => {
  galaxyStore.nodes = [node('left'), node('right', 'XWing')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(galaxyStore.connectWebSocket).toHaveBeenCalled());
  const svg = view.container.querySelector('svg#galaxy-svg')!;
  await fireEvent.click(screen.getByRole('button', { name: 'Fit view' }));
  const original = d3.zoomTransform(svg).k;
  await fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  expect(d3.zoomTransform(svg).k).toBeGreaterThan(original);
  await fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Fit view' }));
  const transform = d3.zoomTransform(svg);
  for (const star of view.container.querySelectorAll('.galaxy-node')) {
    const [x, y] = transform.apply([Number(star.getAttribute('cx')), Number(star.getAttribute('cy'))]);
    expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(800);
    expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(600);
  }
});

it('lets people pause motion and hide connection lines without losing puzzles', async () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() } as any);
  galaxyStore.nodes = [node('one'), node('two')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(galaxyStore.connectWebSocket).toHaveBeenCalled());
  await fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
  expect(view.container.querySelector('.galaxy-main')).toHaveClass('motion-paused');
  await fireEvent.click(screen.getByRole('button', { name: 'Resume motion' }));
  expect(view.container.querySelector('.galaxy-main')).not.toHaveClass('motion-paused');
  expect(view.container.querySelector('.galaxy-main')).toHaveClass('intro-complete');
  await fireEvent.click(screen.getByRole('button', { name: 'Connections' }));
  expect(view.container.querySelector('.galaxy-main')).toHaveClass('lines-hidden');
  expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(2);
});

it('selects the nearest star when expanded pointer targets overlap', async () => {
  galaxyStore.nodes = [node('one'), node('two')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(galaxyStore.connectWebSocket).toHaveBeenCalled());
  const svg = view.container.querySelector('svg#galaxy-svg')!;
  const [first, second] = [...view.container.querySelectorAll('.galaxy-node')];
  const [clientX, clientY] = d3.zoomTransform(svg).apply([Number(second.getAttribute('cx')), Number(second.getAttribute('cy'))]);
  await fireEvent.click(first, { detail: 1, clientX, clientY });
  expect(galaxyStore.selectedNode?.id).toBe('two');
});

it('honors reduced motion and refreshes the scene for a newly discovered puzzle', async () => {
  galaxyStore.nodes = [node('one')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(galaxyStore.connectWebSocket).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'Motion reduced by device setting' })).toBeDisabled();
  const originalX = view.container.querySelector('.galaxy-node')!.getAttribute('cx');
  galaxyStore.addLiveNode(node('two'));
  await tick();
  expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(2);
  expect(view.container.querySelector('.galaxy-node')).toHaveAttribute('cx', originalX);
  galaxyStore.updateNodePlayCount('one', 12);
  await tick();
  expect(screen.getByRole('button', { name: 'Puzzle CODEone, Easy, 12 plays' })).toBeInTheDocument();
});

it('recovers from a hidden sky by restoring standard constellation filters', async () => {
  galaxyStore.nodes = [node('one')];
  galaxyStore.activeFilters = new Set();
  render(GalaxyGraph);
  expect(screen.getByText('No stars in this view.')).toBeInTheDocument();
  await fireEvent.click(screen.getByRole('button', { name: 'Back to the atlas' }));
  expect(galaxyStore.activeFilters.has('singles')).toBe(true);
  expect(galaxyStore.activeFilters.has('chains')).toBe(false);
});

it('shows a recoverable connection error and retries in place', async () => {
  galaxyStore.error = 'Check your connection and try again.';
  render(GalaxyGraph);
  expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load the galaxy.');
  await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(galaxyStore.fetchData).toHaveBeenCalledTimes(2);
});

it('cancels pending initialization and removes browser listeners on navigation', async () => {
  let finish!: () => void;
  vi.mocked(galaxyStore.fetchData).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const removeListener = vi.spyOn(window, 'removeEventListener');
  galaxyStore.loading = true;
  const view = render(GalaxyGraph);
  expect(screen.getByRole('status')).toHaveTextContent('Bringing the sky into focus.');
  view.unmount(); finish(); await tick();
  expect(galaxyStore.connectWebSocket).not.toHaveBeenCalled();
  expect(galaxyStore.disconnectWebSocket).toHaveBeenCalledOnce();
  expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
});

it('explores a named technique from its key and restores all constellations', async () => {
 Element.prototype.scrollIntoView = vi.fn();
 galaxyStore.nodes = [node('one'), node('two', 'HiddenSingle'), node('three', 'XWing')];
 const view = render(GalaxyGraph); render(TechniqueStarKey);
 await waitFor(() => expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(3));
 await fireEvent.click(screen.getByRole('button', {name:'Explore Naked Single puzzles'}));
 expect(galaxyStore.focusedTechnique).toBe('NakedSingle');
 expect(view.container.querySelectorAll('.galaxy-node[aria-hidden="false"]')).toHaveLength(1);
 expect(screen.getByRole('button', {name:'← All constellations'})).toHaveFocus();
 await fireEvent.click(screen.getByRole('button', {name:'← All constellations'}));
 expect(galaxyStore.focusedTechnique).toBeNull();
 expect(view.container.querySelectorAll('.galaxy-node[aria-hidden="false"]')).toHaveLength(3);
});

it('restores a hidden family from the rail and closes filters with focus returned', async () => {
 galaxyStore.nodes = [node('one'), node('two', 'XWing')];
 galaxyStore.activeFilters = new Set(['singles']);
 render(GalaxyPage);
 const filter = screen.getByRole('button', {name:'Filter sky'});
 await fireEvent.click(filter);
 expect(filter).toHaveAttribute('aria-expanded', 'true');
 await fireEvent.keyDown(window, {key:'Escape'});
 expect(filter).toHaveAttribute('aria-expanded', 'false'); expect(filter).toHaveFocus();
 await fireEvent.click(screen.getByRole('button', {name:/^Fish\s*1$/}));
 expect(galaxyStore.activeFilters.has('fish')).toBe(true);
 expect(galaxyStore.focusedFamily).toBe('fish');
 await fireEvent.click(screen.getByRole('button', {name:/All constellations\s*2/}));
 expect(galaxyStore.focusedFamily).toBeNull();
 expect(galaxyStore.activeFilters.has('fish')).toBe(true);
});
