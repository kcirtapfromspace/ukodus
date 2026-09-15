import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Home from '../src/routes/+page.svelte';
import About from '../src/routes/about/+page.svelte';
import HowToPlay from '../src/routes/how-to-play/+page.svelte';
import Privacy from '../src/routes/privacy/+page.svelte';
import Difficulty from '../src/routes/difficulty/+page.svelte';
import Techniques from '../src/routes/techniques/+page.svelte';
import AppPage from '../src/routes/app/+page.svelte';
import { playerStore } from '../src/lib/stores/player.svelte';

beforeEach(() => { playerStore.secrets = false; });
afterEach(cleanup);

it.each([
  [Home, 'Sudoku Galaxy', 'https://ukodus.now/'],
  [About, 'Why Ukodus?', 'https://ukodus.now/about/'],
  [HowToPlay, 'How to Play Sudoku', 'https://ukodus.now/how-to-play/'],
  [Privacy, 'Privacy Policy', 'https://ukodus.now/privacy/']
])('renders a public information page with its canonical URL', (component, heading, url) => {
  render(component);
  expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', url);
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy();
});

it('offers a direct path from the home page to playing and exploring puzzles', () => {
  render(Home);
  expect(screen.getByRole('link', { name: 'Play Now' })).toHaveAttribute('href', '/play/');
  expect(screen.getByRole('link', { name: 'Explore Galaxy' })).toHaveAttribute('href', '/galaxy/');
  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')].map((el) => JSON.parse(el.textContent!));
  expect(schemas.map((schema) => schema['@type'])).toEqual(['WebSite', 'FAQPage', 'WebApplication']);
});

it('updates the difficulty guide when secret tiers are unlocked', async () => {
  render(Difficulty);
  expect(screen.getByRole('heading', { name: '6 Difficulty Tiers' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Extreme/ })).not.toBeInTheDocument();
  playerStore.secrets = true;
  await tick();
  expect(screen.getByRole('heading', { name: '8 Difficulty Tiers' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Extreme/ })).toBeInTheDocument();
});

it('reveals secret technique families and individual techniques when unlocked', async () => {
  render(Techniques);
  expect(screen.getByRole('heading', { name: 'Solving Techniques' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Chains' })).not.toBeInTheDocument();
  expect(screen.queryByText('Hidden Quad', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Arithmetic Counting', { exact: true })).not.toBeInTheDocument();
  playerStore.secrets = true;
  await tick();
  expect(screen.getByRole('heading', { name: 'Chains' })).toBeInTheDocument();
  expect(screen.getByText('Hidden Quad', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Arithmetic Counting', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('8.5 (uncalibrated)', { exact: true })).toBeInTheDocument();
  expect(document.querySelectorAll('.technique-table tbody tr')).toHaveLength(46);
});

it('switches the app demonstration using both click and arrow keys', async () => {
  render(AppPage);
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Terminal UI');
  await fireEvent.click(screen.getByRole('tab', { name: 'WASM' }));
  expect(screen.getByRole('tabpanel')).toHaveTextContent('WASM');
  expect(screen.getByRole('tab', { name: 'WASM' })).toHaveAttribute('aria-selected', 'true');
  await fireEvent.keyDown(screen.getByRole('tab', { name: 'WASM' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Terminal UI');
  for (const link of screen.getAllByRole('link', { name: 'Play in browser' })) {
    expect(link).toHaveAttribute('href', '/play/');
  }
});
