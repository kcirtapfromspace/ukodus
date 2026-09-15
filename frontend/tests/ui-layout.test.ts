import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import RootLayout from '../src/routes/+layout.svelte';
import PlayLayout from '../src/routes/play/+layout.svelte';
import { prerender, trailingSlash } from '../src/routes/+layout';
import { ssr as playSsr } from '../src/routes/play/+page';
import { ssr as galaxySsr } from '../src/routes/galaxy/+page';
import { playerStore } from '../src/lib/stores/player.svelte';
import { posthogStore } from '../src/lib/stores/posthog.svelte';

const navigation = vi.hoisted(() => ({ afterNavigate: vi.fn() }));
vi.mock('$app/navigation', () => navigation);
vi.mock('$app/state', () => ({ page: { url: new URL('https://ukodus.now/play/') } }));
vi.mock('../src/lib/stores/posthog.svelte', () => ({
  posthogStore: { init: vi.fn(), identifyPlayer: vi.fn(), capturePageView: vi.fn() }
}));

const children = createRawSnippet(() => ({ render: () => '<main>Route content</main>' }));

beforeEach(() => {
  playerStore.id = 'saved-player';
  playerStore.tag = 'ACE';
  playerStore.secrets = false;
  document.body.classList.remove('secrets-unlocked');
});
afterEach(() => {
  cleanup();
  document.body.classList.remove('secrets-unlocked');
});

it('renders the shared navigation and route content while restoring the player identity', () => {
  playerStore.secrets = true;
  render(RootLayout, { children });
  expect(screen.getByRole('main')).toHaveTextContent('Route content');
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy/');
  expect(document.body).toHaveClass('secrets-unlocked');
  expect(posthogStore.init).toHaveBeenCalledOnce();
  expect(posthogStore.identifyPlayer).toHaveBeenCalledWith('saved-player', 'ACE');
});

it('initializes analytics for an anonymous visitor without unlocking secret styles', () => {
  playerStore.id = '';
  render(RootLayout, { children });
  expect(posthogStore.init).toHaveBeenCalledOnce();
  expect(posthogStore.identifyPlayer).not.toHaveBeenCalled();
  expect(document.body).not.toHaveClass('secrets-unlocked');
});

it('omits an unset player tag and captures only navigations with a destination URL', () => {
  playerStore.tag = '';
  render(RootLayout, { children });
  expect(posthogStore.identifyPlayer).toHaveBeenCalledWith('saved-player', undefined);
  const afterNavigate = navigation.afterNavigate.mock.calls[0][0];
  afterNavigate({ to: null });
  afterNavigate({ to: {} });
  expect(posthogStore.capturePageView).not.toHaveBeenCalled();
  afterNavigate({ to: { url: new URL('https://ukodus.now/galaxy/?family=singles') } });
  expect(posthogStore.capturePageView).toHaveBeenCalledExactlyOnceWith('https://ukodus.now/galaxy/?family=singles');
});

it('renders gameplay children and keeps browser-dependent routes compatible with static hosting', () => {
  render(PlayLayout, { children });
  expect(screen.getByRole('main')).toHaveTextContent('Route content');
  expect({ prerender, trailingSlash, playSsr, galaxySsr }).toEqual({
    prerender: true, trailingSlash: 'always', playSsr: false, galaxySsr: false
  });
});
