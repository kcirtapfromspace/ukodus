<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	let menuOpen = $state(false);
	let menuButton: HTMLButtonElement;
	let navigation: HTMLElement;

	async function toggleMenu() {
		menuOpen = !menuOpen;
		if (menuOpen) {
			await tick();
			navigation.querySelector('a')?.focus();
		}
	}

	$effect(() => {
		page.url.pathname;
		menuOpen = false;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen) {
			menuOpen = false;
			menuButton?.focus();
		}
	}

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/play/', label: 'Play' },
		{ href: '/galaxy/', label: 'Galaxy' },
		{ href: '/techniques/', label: 'Techniques' },
		{ href: '/app/', label: 'App' },
		{ href: 'https://github.com/kcirtapfromspace/sudoku-core', label: 'GitHub' }
	];
</script>

<svelte:window onkeydown={handleKeydown} />

<header id="topbar" class="topbar">
	<div class="wrap topbar-inner">
		<a class="brand" href="/" aria-label="Ukodus home">
			<img src="/assets/app-icon.png" alt="" width="34" height="34" />
			<div class="wordmark">
				<strong>Ukodus</strong>
				<span>Sudoku Galaxy</span>
			</div>
		</a>

		<div class="navigation">
		<nav id="primary-navigation" aria-label="Primary" class:open={menuOpen} bind:this={navigation}>
			{#each navLinks as link}
				<a
					class="navlink"
					onclick={() => menuOpen = false}
					href={link.href}
					aria-current={page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href)) ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="nav-controls">
			<ThemeToggle />
			<button class="menu-toggle" type="button" bind:this={menuButton}
				aria-expanded={menuOpen} aria-controls="primary-navigation"
				onclick={toggleMenu}>
				{menuOpen ? 'Close' : 'Menu'}
				<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
					{#if menuOpen}<path d="m5 5 10 10M15 5 5 15" />{:else}<path d="M3 6h14M3 13h14" />{/if}
				</svg>
			</button>
		</div>
		</div>
	</div>
</header>

<style>
	.topbar { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--grid-strong); background: color-mix(in srgb, var(--paper) 92%, transparent); backdrop-filter: blur(16px); }
	.topbar-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 80px; }
	.brand { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
	.brand:hover { text-decoration: none; }
	.brand img { border-radius: 10px; }
	.wordmark { display: flex; flex-direction: column; gap: 3px; }
	.wordmark strong { font-family: var(--serif); font-size: 21px; letter-spacing: -0.6px; line-height: 1; }
	.wordmark span { font-size: 10px; color: var(--muted); letter-spacing: 0.06em; }
	.navigation, nav, .nav-controls { display: flex; align-items: center; gap: 6px; }
	.navigation { gap: 20px; }
	.navlink { position: relative; display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; font-size: 13px; font-weight: 500; color: var(--muted); transition: color 180ms ease, background 180ms ease; border-radius: 8px; }
	.navlink:hover { color: var(--ink); background: var(--grid); text-decoration: none; }
	.navlink[aria-current='page'] { color: var(--ink); background: var(--grid-strong); }
	.menu-toggle { display: none; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; border: 1px solid var(--grid-strong); border-radius: 8px; font: 500 13px var(--sans); background: var(--paper2); color: var(--ink); cursor: pointer; }
	@media (max-width: 760px) {
		.topbar-inner { min-height: 72px; gap: 12px; }
		.navigation { gap: 0; }
		.menu-toggle { display: inline-flex; }
		nav { display: none; position: absolute; top: calc(100% + 8px); left: 14px; right: 14px; padding: 8px; border: 1px solid var(--grid-strong); border-radius: 16px; background: var(--paper2); box-shadow: 0 16px 32px -16px #281c1640; }
		nav.open { display: grid; grid-template-columns: 1fr 1fr; }
		.navlink { min-height: 48px; padding: 0 16px; }
	}
</style>
