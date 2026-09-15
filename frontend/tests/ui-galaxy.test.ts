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
import type { GalaxyNode } from '../src/lib/api/types';

vi.mock('../src/lib/stores/posthog.svelte', () => ({ posthogStore: { captureEvent: vi.fn() } }));

const node = (id: string, technique = 'NakedSingle', extras: Partial<GalaxyNode> = {}) => ({
  id, puzzle_hash: id, short_code: `CODE${id}`, puzzle_string: '1'.repeat(81),
  difficulty: 'Easy', se_rating: 2.3, techniques: [technique],
  play_count: 4, avg_time_secs: 125, ...extras
}) as GalaxyNode;

beforeEach(() => {
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
  galaxyStore.nodes = [node('1'), node('2'), node('3', 'HiddenSingle'), node('4', 'XWing')];
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
});

it('shows aggregate counts and counts each observed visible technique once', async () => {
  galaxyStore.nodes = [node('1'), node('2'), node('3', 'XChain')];
  galaxyStore.stats = { total_puzzles: 1234, total_plays: 9876 } as any;
  const view = render(GalaxyStats);
  expect(screen.getByText('1,234')).toBeInTheDocument();
  expect(screen.getByText('9,876')).toBeInTheDocument();
  expect(view.container.querySelectorAll('.stat-value')[2]).toHaveTextContent(/^1 \/ /);
  playerStore.secrets = true;
  await tick();
  expect(view.container.querySelectorAll('.stat-value')[2]).toHaveTextContent(/^2 \/ /);
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
  // jsdom has no SVG layout; provide the dimensions normally supplied by a browser.
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} });
  Object.defineProperty(SVGSVGElement.prototype, 'width', { configurable: true, value: { baseVal: { value: 800 } } });
  Object.defineProperty(SVGSVGElement.prototype, 'height', { configurable: true, value: { baseVal: { value: 600 } } });
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
