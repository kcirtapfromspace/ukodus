<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { loadWasm, type SudokuGame } from '$lib/wasm/loader';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import { GameBridge } from './GameBridge';
	import { puzzlePrefetch } from '$lib/wasm/puzzle-prefetch';
	import { apiClient } from '$lib/api/client';

	interface Props {
		onready: (game: SudokuGame) => void;
	}

	let { onready }: Props = $props();

	let canvasEl: HTMLCanvasElement;
	let game: SudokuGame | null = null;
	let bridge: GameBridge | null = null;
	let animationId: number | null = null;
	let loading = $state(true);
	let errorMsg = $state('');

	function calculateSize(): { width: number; height: number } {
		const topbar = document.getElementById('topbar');
		const statsBar = document.getElementById('stats-bar');
		const footer = document.getElementById('play-footer');
		const chromeH =
			(topbar?.offsetHeight || 50) +
			(statsBar?.offsetHeight || 36) +
			(footer?.offsetHeight || 32) +
			32;
		const availH = window.innerHeight - chromeH;
		const availW = Math.min(window.innerWidth - 40, 1400);
		return { width: Math.max(400, availW), height: Math.max(300, availH) };
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!game) return;
		if (document.querySelector('.tag-overlay') || document.querySelector('.lb-overlay')) return;

		const gameKeys = [
			'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
			'h', 'j', 'k', 'l', 'w', 'a', 's', 'd',
			'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
			'c', 'u', 'p', 'n', 'q', 'f', 'x',
			'Delete', 'Backspace', ' ', 'Enter', 'Escape', '?', '!'
		];

		if (gameKeys.includes(event.key) || (event.ctrlKey && event.key === 'r')) {
			event.preventDefault();
		}

		game.handle_key(event);
	}

	function setPageBackground(theme: string) {
		const layout = document.getElementById('game-container');
		if (theme === 'dark') {
			document.body.style.background = '#18182a';
			if (layout) layout.style.background = '#18182a';
		} else if (theme === 'high-contrast') {
			document.body.style.background = '#000';
			if (layout) layout.style.background = '#000';
		} else {
			document.body.style.background = '';
			if (layout) layout.style.background = '';
		}
	}

	onMount(async () => {
		try {
			const wasm = await loadWasm();
			game = new wasm.SudokuGame('game-canvas');

			const initial = calculateSize();
			game.resize(initial.width, initial.height);

			// Map theme names: store uses 'high-contrast', WASM uses 'high_contrast'
			const wasmTheme = themeStore.current === 'high-contrast' ? 'high_contrast' : themeStore.current;
			game.set_theme(wasmTheme);
			setPageBackground(themeStore.current);

			loading = false;

			requestAnimationFrame(() => {
				if (!game) return;
				const size = calculateSize();
				game.resize(size.width, size.height);
			});

			// URL parameters
			const params = new URLSearchParams(window.location.search);
			const shortCode = params.get('s');
			const sharedPuzzle = params.get('p');

			if (shortCode && shortCode.length === 8) {
				try { game.load_short_code(shortCode); } catch { /* invalid */ }
			} else if (sharedPuzzle && sharedPuzzle.length === 81) {
				try { game.load_puzzle_string(sharedPuzzle); } catch { /* invalid */ }
			} else {
				const saved = localStorage.getItem('sudoku_save');
				if (saved) {
					try { game.load_state_json(saved); } catch { /* corrupt */ }
				}
			}

			// Pre-generate next puzzle in background
			try {
				const currentDiff = game.difficulty()?.toLowerCase() || 'medium';
				puzzlePrefetch.warmup(currentDiff);
			} catch { /* prefetch not critical */ }

			const savedStats = localStorage.getItem('sudoku_stats');
			if (savedStats) {
				try { game.load_stats_json(savedStats); } catch { /* corrupt */ }
			}

			try {
				if (playerStore.secrets) game.set_secrets_unlocked?.(true);
			} catch { /* method not available */ }

			// Resize handler
			let resizeTimeout: ReturnType<typeof setTimeout>;
			window.addEventListener('resize', () => {
				clearTimeout(resizeTimeout);
				resizeTimeout = setTimeout(() => {
					if (!game) return;
					const size = calculateSize();
					game.resize(size.width, size.height);
				}, 100);
			});

			// Game loop
			function gameLoop() {
				game!.tick();
				animationId = requestAnimationFrame(gameLoop);
			}
			gameLoop();

			// Save on unload
			window.addEventListener('beforeunload', () => {
				if (!game) return;
				localStorage.setItem('sudoku_save', game.get_state_json());
				localStorage.setItem('sudoku_stats', game.get_stats_json());
				try {
					localStorage.setItem('ukodus_secrets', game.is_secrets_unlocked?.() ? '1' : '0');
				} catch { /* method not available */ }
			});

			// Start bridge
			bridge = new GameBridge(game);
			bridge.start();

			posthogStore.captureEvent('game_started', {});

			onready(game);
		} catch (err: unknown) {
			errorMsg = 'Failed to load: ' + (err instanceof Error ? err.message : String(err));
			loading = false;
		}
	});

	// Sync theme to WASM
	$effect(() => {
		if (!game) return;
		const wasmTheme = themeStore.current === 'high-contrast' ? 'high_contrast' : themeStore.current;
		game.set_theme(wasmTheme);
		setPageBackground(themeStore.current);
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
		bridge?.stop();
		puzzlePrefetch.destroy();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if loading}
	<div class="loading">Loading Sudoku</div>
{:else if errorMsg}
	<div class="loading">{errorMsg}</div>
{/if}

<div class="canvas-area" style:display={loading || errorMsg ? 'none' : 'flex'}>
	<div class="canvas-frame">
		<canvas bind:this={canvasEl} id="game-canvas" width="1000" height="700"></canvas>
	</div>
	<div class="mobile-warning">
		This game requires a keyboard.<br />
		<a href="https://apps.apple.com/us/app/sudoku/id6758485043">Get the iOS app</a>
		or use a desktop browser.
	</div>
</div>

<style>
	.canvas-area {
		display: flex; align-items: center; justify-content: center;
		min-height: 0; overflow: hidden; padding: 8px 12px; flex: 1;
	}
	.canvas-frame {
		border-radius: var(--radius);
		border: 1px solid rgba(20, 20, 20, 0.12);
		background: rgba(255, 255, 255, 0.66);
		box-shadow: var(--shadow-soft, 0 4px 12px rgba(0, 0, 0, 0.06));
		padding: 6px; line-height: 0;
	}
	:global(#game-canvas) {
		border-radius: 16px;
		display: block;
	}
	.loading {
		position: absolute; top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		font-family: var(--serif); font-size: 1.2rem; color: var(--muted);
	}
	.loading::after { content: ''; animation: dots 1.5s infinite; }
	@keyframes dots {
		0%, 20% { content: '.'; }
		40% { content: '..'; }
		60%, 100% { content: '...'; }
	}
	.mobile-warning { display: none; text-align: center; padding: 20px; color: var(--accent, #f59e0b); font-size: 14px; }
	@media (max-width: 500px) {
		.mobile-warning { display: block; }
		.canvas-frame { display: none; }
	}
</style>
