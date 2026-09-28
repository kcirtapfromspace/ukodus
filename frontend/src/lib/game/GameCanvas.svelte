<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { loadWasm, type SudokuGame } from '$lib/wasm/loader';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { playerStore } from '$lib/stores/player.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import { GameBridge } from './GameBridge';
	import { puzzlePrefetch } from '$lib/wasm/puzzle-prefetch';
	import { apiClient } from '$lib/api/client';
	import { miningCoordinator } from '$lib/wasm/mining-coordinator';

	interface Props {
		onready: (game: SudokuGame) => void;
	}

	let { onready }: Props = $props();

	let canvasEl: HTMLCanvasElement;
	let game = $state.raw<SudokuGame | null>(null);
	let bridge: GameBridge | null = null;
	let animationId: number | null = null;
	let initialResizeId: number | null = null;
	let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
	let destroyed = false;
	let loading = $state(true);
	let errorMsg = $state('');

	function calculateSize(): { width: number; height: number } {
		const topbar = document.getElementById('topbar');
		const statsBar = document.getElementById('stats-bar');
		const toolbar = document.getElementById('play-toolbar');
		const chromeH = (topbar?.offsetHeight || 80) + (toolbar?.offsetHeight || 64) + (statsBar?.offsetHeight || 60) + 72;
		return { width: Math.max(600, Math.min(window.innerWidth - 64, 1080)), height: Math.max(500, window.innerHeight - chromeH) };
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!game || event.defaultPrevented) return;
		if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, summary, [contenteditable="true"]')) return;
		if (document.querySelector('.tag-overlay, .lb-overlay, .menu-toggle[aria-expanded="true"]')) return;

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
			document.body.style.background = '#1c1b19';
			if (layout) layout.style.background = '#1c1b19';
		} else if (theme === 'high-contrast') {
			document.body.style.background = '#000';
			if (layout) layout.style.background = '#000';
		} else {
			document.body.style.background = '';
			if (layout) layout.style.background = '';
		}
	}

	function handleResize() {
		if (resizeTimeout !== null) clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			if (!game) return;
			const size = calculateSize();
			game.resize(size.width, size.height);
		}, 100);
	}

	function saveGame() {
		if (!game) return;
		localStorage.setItem('sudoku_save', game.get_state_json());
		localStorage.setItem('sudoku_stats', game.get_stats_json());
		try {
			localStorage.setItem('ukodus_secrets', game.is_secrets_unlocked?.() ? '1' : '0');
		} catch { /* method not available */ }
	}

	function warmupPuzzle(difficulty: string) {
		try {
			puzzlePrefetch.warmup(difficulty);
		} catch { /* background prefetch must not interrupt the playable puzzle */ }
	}

	onMount(async () => {
		try {
			const wasm = await loadWasm();
			if (destroyed) return;
			game = new wasm.SudokuGame('game-canvas');

			const initial = calculateSize();
			game.resize(initial.width, initial.height);

			// Map theme names: store uses 'high-contrast', WASM uses 'high_contrast'
			const wasmTheme = themeStore.current === 'high-contrast' ? 'high_contrast' : themeStore.current;
			game.set_theme(wasmTheme);
			setPageBackground(themeStore.current);

			loading = false;

			initialResizeId = requestAnimationFrame(() => {
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
				warmupPuzzle(currentDiff);
			} catch { /* prefetch not critical */ }

			const savedStats = localStorage.getItem('sudoku_stats');
			if (savedStats) {
				try { game.load_stats_json(savedStats); } catch { /* corrupt */ }
			}

			try {
				if (playerStore.secrets) game.set_secrets_unlocked?.(true);
			} catch { /* method not available */ }

			// Resize handler
			window.addEventListener('resize', handleResize);

			// Async new-game handler: prefetch → API → worker → sync fallback
			let generatingNewGame = false;
			async function handlePendingNewGame() {
				if (generatingNewGame || !game) return;
				const difficulty = game.take_pending_difficulty?.() || '';
				if (!difficulty) return;

				generatingNewGame = true;
				const diff = difficulty.toLowerCase();

				try {
					// 1. Try prefetch cache (instant)
					const cached = puzzlePrefetch.take(diff);
					if (cached) {
						game.load_pregenerated?.(JSON.stringify(cached));
						bridge?.reset();
						warmupPuzzle(diff);
						generatingNewGame = false;
						return;
					}

					// 2. Try API (fast, server has pre-analyzed puzzles)
					const apiPuzzle = await apiClient.fetchRandomPuzzle(diff);
					if (!game || destroyed) return;
					if (apiPuzzle && game) {
						// API returns PuzzleDetail — we need solution_string too.
						// Use load_puzzle_string which solves+rates, but at least
						// avoids the heavy generation step.
						game.load_puzzle_string(apiPuzzle.puzzle_string);
						bridge?.reset();
						warmupPuzzle(diff);
						generatingNewGame = false;
						return;
					}

					// 3. Try web worker (background, non-blocking)
					const workerPuzzle = await puzzlePrefetch.get(diff);
					if (workerPuzzle && game) {
						game.load_pregenerated?.(JSON.stringify(workerPuzzle));
						bridge?.reset();
						warmupPuzzle(diff);
						generatingNewGame = false;
						return;
					}
				} catch {
					/* fall through to sync */
				}

				// 4. Last resort: synchronous WASM generation (blocks main thread)
				if (game) {
					game.new_game(diff);
					bridge?.reset();
					warmupPuzzle(diff);
				}
				generatingNewGame = false;
			}

			// Game loop — checks for pending new game each frame
			function gameLoop() {
				if (!game || destroyed) return;
				game.tick();
				if (game.screen_state?.() === 'Loading') {
					handlePendingNewGame();
				}
				animationId = requestAnimationFrame(gameLoop);
			}
			gameLoop();

			// Save on unload
			window.addEventListener('beforeunload', saveGame);

			// Start bridge
			bridge = new GameBridge(game);
			bridge.start();

			// Start background mining (non-blocking, best-effort)
			miningCoordinator.start();

			posthogStore.captureEvent('game_started', {});

			onready(game);
		} catch (err: unknown) {
			if (destroyed) return;
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
		destroyed = true;
		try {
			saveGame();
		} catch { /* storage failures must not prevent navigation cleanup */ }
		if (animationId !== null) cancelAnimationFrame(animationId);
		if (initialResizeId !== null) cancelAnimationFrame(initialResizeId);
		if (resizeTimeout !== null) clearTimeout(resizeTimeout);
		if (typeof window !== 'undefined') {
			document.body.style.background = '';
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('beforeunload', saveGame);
		}
		bridge?.stop();
		puzzlePrefetch.destroy();
		miningCoordinator.stop();
		game = null;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if loading}
	<div class="game-state" role="status"><span class="board-placeholder" aria-hidden="true"></span><h2>Loading Sudoku</h2><p>Preparing your next puzzle.</p></div>
{:else if errorMsg}
	<div class="game-state" role="alert"><h2>We couldn’t start the puzzle.</h2><p>{errorMsg}</p><button class="btn" onclick={() => window.location.reload()}>Try again</button></div>
{/if}

<div class="canvas-area" style:display={loading || errorMsg ? 'none' : 'flex'}>
	<div class="canvas-frame">
		<canvas bind:this={canvasEl} id="game-canvas" tabindex="0" aria-label="Sudoku game board. Arrow keys move, digits enter numbers, and question mark requests a hint." width="1000" height="700"></canvas>
	</div>
	<div class="mobile-warning">
		<span class="board-placeholder" aria-hidden="true"></span>
		<p class="kicker">Made for a little more space</p><h2>Take your next puzzle<br />to iPhone.</h2>
		<p>The browser game uses a keyboard and a wider screen. On your phone, the iOS app gives every move room to breathe.</p>
		<a class="btn primary" href="https://apps.apple.com/us/app/sudoku/id6758485043">Get the iOS app ↗</a>
		<a class="mobile-guide" href="/how-to-play/">Learn the rules while you’re here</a>
	</div>
</div>

<style>
	.canvas-area { display: flex; align-items: center; justify-content: center; min-width: 0; }
	.canvas-frame { max-width: 100%; padding: 6px; border: 1px solid var(--border); background: var(--paper); border-radius: 16px; line-height: 0; overflow: hidden; }
	:global(#game-canvas) { display: block; max-width: 100%; height: auto !important; border-radius: 10px; }
	.game-state, .mobile-warning { min-height: 480px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px; border: 1px solid var(--border); background: var(--surface); border-radius: 16px; }
	.game-state h2, .mobile-warning h2 { margin: 0 0 16px; font-size: 32px; }
	.game-state p, .mobile-warning > p:not(.kicker) { max-width: 38ch; margin: 0 0 24px; color: var(--muted); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
	.board-placeholder { display: block; width: 72px; height: 72px; border: 1px solid var(--border); background: repeating-linear-gradient(0deg, transparent 0 23px, var(--border) 23px 24px), repeating-linear-gradient(90deg, transparent 0 23px, var(--border) 23px 24px); margin-bottom: 32px; border-radius: 4px; }
	.mobile-warning { display: none; }
	.mobile-guide { margin-top: 20px; min-height: 44px; display: inline-flex; align-items: center; font-size: 12px; text-decoration: underline; text-underline-offset: 4px; }
	@media (max-width: 639px) { .mobile-warning { display: flex; width: 100%; padding: 32px 22px; } .canvas-frame { display: none; } }
</style>
