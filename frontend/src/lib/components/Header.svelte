<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
	import { page } from '$app/state';

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/play/', label: 'Play' },
		{ href: '/galaxy/', label: 'Galaxy' },
		{ href: '/techniques/', label: 'Techniques' },
		{ href: '/app/', label: 'App' },
		{ href: 'https://github.com/kcirtapfromspace/sudoku-core', label: 'GitHub' }
	];
</script>

<header class="topbar">
	<div class="wrap topbar-inner">
		<a class="brand" href="/" aria-label="Ukodus home">
			<img src="/assets/app-icon.png" alt="" width="34" height="34" />
			<div class="wordmark">
				<strong>Ukodus</strong>
				<span>Sudoku Galaxy</span>
			</div>
		</a>

		<nav aria-label="Primary">
			{#each navLinks as link}
				<a
					class="navlink"
					href={link.href}
					aria-current={page.url.pathname === link.href || (link.href !== '/' && page.url.pathname.startsWith(link.href)) ? 'page' : undefined}
				>
					{link.label}
				</a>
			{/each}
			<ThemeToggle />
		</nav>
	</div>
</header>
