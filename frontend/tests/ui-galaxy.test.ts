import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import * as d3 from 'd3';
import GalaxyGraph from '../src/lib/galaxy/GalaxyGraph.svelte';
import GalaxyDetail from '../src/lib/galaxy/GalaxyDetail.svelte';
import GalaxyFilters from '../src/lib/galaxy/GalaxyFilters.svelte';
import GalaxyStats from '../src/lib/galaxy/GalaxyStats.svelte';
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
  // jsdom has no SVG layout; supply the dimensions and zoom viewport of a browser.
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  Object.defineProperty(SVGSVGElement.prototype, 'width', { configurable: true, value: { baseVal: { value: 800 } } });
  Object.defineProperty(SVGSVGElement.prototype, 'height', { configurable: true, value: { baseVal: { value: 600 } } });
  galaxyStore.nodes = [];
  galaxyStore.edges = [];
  galaxyStore.stats = null;
  galaxyStore.selectedNode = null;
  galaxyStore.focusedFamily = null;
  galaxyStore.loading = false;
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
  expect(await screen.findByText('—')).toBeInTheDocument();
});

it('filters families, focuses techniques by keyboard, and returns to all families', async () => {
  galaxyStore.nodes = [node('1'), node('2'), node('3', 'HiddenSingle'), node('4', 'XWing'), node('5', 'Arithmetic Counting')];
  render(GalaxyFilters);
  expect(screen.queryByRole('button', { name: 'Chains' })).not.toBeInTheDocument();
  const singleCheckbox = screen.getByRole('checkbox', { name: /Singles/ });
  expect(singleCheckbox).toBeChecked();
  await fireEvent.click(singleCheckbox);
  expect(galaxyStore.activeFilters.has('singles')).toBe(false);
  await fireEvent.keyDown(screen.getByRole('button', { name: 'Singles' }), { key: 'Enter' });
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
  expect(screen.getByRole('link', { name: 'Play Now' })).toHaveAttribute('href', '/play/');
  expect(init).toHaveBeenCalledWith(true);
  expect(document.title).toBe('Sudoku Galaxy — Ukodus');
});

it('renders real graph nodes, links and hulls, and supports hover, selection, filters and family zoom', async () => {
  galaxyStore.nodes = [
    node('a', 'NakedSingle', { x: 50, y: 50 }),
    node('b', 'NakedSingle', { x: 150, y: 60 }),
    node('c', 'NakedSingle', { x: 100, y: 150 }),
    node('d', 'HiddenSingle', { x: 80, y: 100 }),
    node('e', 'XWing', { x: 500, y: 400 })
  ];
  galaxyStore.edges = [{ source: 'a', target: 'b', similarity: 0.8 }] as any;
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(5));
  expect(view.container.querySelectorAll('.galaxy-edge')).toHaveLength(1);
  expect(view.container.querySelector('.cluster-hull')).toBeInTheDocument();
  const circle = view.container.querySelector('.galaxy-node')!;
  await fireEvent.mouseOver(circle, { clientX: 40, clientY: 80 });
  const tooltip = view.container.querySelector('.galaxy-tooltip')!;
  expect(tooltip).toHaveClass('visible');
  expect(tooltip).toHaveTextContent('CODEa');
  expect(tooltip).toHaveTextContent('2.3');
  await fireEvent.mouseMove(circle, { clientX: 50, clientY: 90 });
  expect(tooltip).toHaveStyle({ left: '62px', top: '80px' });
  await fireEvent.mouseOut(circle);
  expect(tooltip).not.toHaveClass('visible');
  await fireEvent.click(circle);
  expect(galaxyStore.selectedNode?.id).toBe('a');
  expect(posthogStore.captureEvent).toHaveBeenCalledWith('galaxy_node_clicked', { puzzle_hash: 'a' });
  await fireEvent.click(view.container.querySelector('svg')!);
  expect(galaxyStore.selectedNode).toBeNull();
  galaxyStore.toggleFilter('singles');
  await tick();
  expect(circle).toHaveClass('dimmed');
  expect(view.container.querySelector('.galaxy-edge')).toHaveAttribute('stroke-opacity', '0.02');
  galaxyStore.toggleFilter('singles');
  await tick();
  const hull = view.container.querySelector('.cluster-hull')!;
  await fireEvent.mouseEnter(hull);
  expect(hull).toHaveAttribute('fill-opacity', '0.12');
  await fireEvent.mouseLeave(hull);
  await fireEvent.click(hull);
  expect(galaxyStore.focusedFamily).toBe('singles');
  expect(view.container.querySelectorAll('.dimmed-family')).toHaveLength(1);
  expect(view.container.querySelector('.technique-hull')).toBeInTheDocument();
  expect(view.container.querySelector('.technique-label')).toHaveTextContent('NakedSingle');
  await waitFor(() => expect(circle).toHaveAttribute('cx'));
  await fireEvent.click(screen.getByRole('button', { name: '← Back to Galaxy' }));
  expect(galaxyStore.focusedFamily).toBeNull();
  expect(view.container.querySelector('.dimmed-family')).toBeNull();
  view.unmount();
  expect(galaxyStore.disconnectWebSocket).toHaveBeenCalledOnce();
});

it('pins a dragged node to the pointer and releases it when the drag ends', async () => {
  galaxyStore.nodes = [node('drag', 'NakedSingle', { x: 50, y: 50 })];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelector('.galaxy-node')).toBeInTheDocument());
  const circle = view.container.querySelector('.galaxy-node')!;
  const datum = d3.select<SVGCircleElement, GalaxyNode>(circle as SVGCircleElement).datum();
  const pointer = (type: string, clientX: number, clientY: number, buttons = 1) => {
    const event = new MouseEvent(type, { bubbles: true, clientX, clientY, buttons });
    // Vitest's Window proxy does not satisfy jsdom's UIEvent constructor check.
    Object.defineProperty(event, 'view', { value: window });
    return event;
  };
  await fireEvent(circle, pointer('mousedown', 50, 50));
  expect(datum.fx).toBeTypeOf('number');
  expect(datum.fy).toBeTypeOf('number');
  const initialX = datum.fx!, initialY = datum.fy!;
  await fireEvent(window, pointer('mousemove', 70, 80));
  expect(datum.fx).toBeCloseTo(initialX + 20);
  expect(datum.fy).toBeCloseTo(initialY + 30);
  await fireEvent(window, pointer('mouseup', 70, 80, 0));
  expect(datum.fx).toBeNull();
  expect(datum.fy).toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

it('replaces tooltip content and shows fallbacks when puzzle metadata is absent', async () => {
  galaxyStore.nodes = [node('known'), node('unknown', 'MysteryTechnique', {
    short_code: '', puzzle_hash: '', difficulty: '', se_rating: undefined, play_count: 0
  })];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelectorAll('.galaxy-node')).toHaveLength(2));
  const [known, unknown] = view.container.querySelectorAll('.galaxy-node');
  const tooltip = view.container.querySelector('.galaxy-tooltip')!;
  await fireEvent.mouseOver(known);
  expect(tooltip).toHaveTextContent('CODEknown');
  await fireEvent.mouseOver(unknown);
  expect(tooltip).not.toHaveTextContent('CODEknown');
  expect(tooltip.querySelector('.tt-hash')).toHaveTextContent('---');
  expect([...tooltip.querySelectorAll('.tt-val')].map((el) => el.textContent)).toEqual(['?', '?', '0']);
  galaxyStore.focusFamily('singles');
  await tick();
  expect([...view.container.querySelectorAll('.technique-label')].map((el) => el.textContent)).toContain('MysteryTechnique');
  await fireEvent.click(view.container.querySelector('svg')!);
  expect(galaxyStore.focusedFamily).toBeNull();
});

it('cancels graph initialization when navigation finishes before the initial fetch', async () => {
  let finish!: () => void;
  vi.mocked(galaxyStore.fetchData).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  galaxyStore.loading = true;
  const view = render(GalaxyGraph);
  expect(screen.getByText('Loading galaxy')).toBeInTheDocument();
  view.unmount();
  galaxyStore.nodes = [node('late')];
  finish();
  await tick();
  expect(galaxyStore.connectWebSocket).not.toHaveBeenCalled();
  expect(galaxyStore.disconnectWebSocket).toHaveBeenCalledOnce();
});

it('debounces resize and releases the resize listener and pending timer on navigation', async () => {
  const addListener = vi.spyOn(window, 'addEventListener');
  const removeListener = vi.spyOn(window, 'removeEventListener');
  galaxyStore.nodes = [node('resize')];
  const view = render(GalaxyGraph);
  await waitFor(() => expect(view.container.querySelector('.galaxy-node')).toBeInTheDocument());
  const resizeListener = addListener.mock.calls.find(([type]) => type === 'resize')![1];
  const bounds = vi.mocked(SVGElement.prototype.getBoundingClientRect);
  const timeouts = vi.spyOn(globalThis, 'setTimeout');
  const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
  bounds.mockClear();
  await fireEvent(window, new Event('resize'));
  await fireEvent(window, new Event('resize'));
  expect(bounds).not.toHaveBeenCalled();
  await waitFor(() => expect(bounds).toHaveBeenCalledOnce());
  galaxyStore.focusFamily('singles');
  await tick();
  bounds.mockClear();
  await fireEvent(window, new Event('resize'));
  await waitFor(() => expect(bounds).toHaveBeenCalledOnce());
  await fireEvent(window, new Event('resize'));
  const pendingTimer = timeouts.mock.results.at(-1)!.value;
  view.unmount();
  expect(removeListener).toHaveBeenCalledWith('resize', resizeListener);
  expect(clearTimeoutSpy).toHaveBeenCalledWith(pendingTimer);
  bounds.mockClear();
  await fireEvent(window, new Event('resize'));
  expect(bounds).not.toHaveBeenCalled();
});
