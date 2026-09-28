<script lang="ts">
	import { playerStore } from '$lib/stores/player.svelte';
	import { apiClient } from '$lib/api/client';
	import { posthogStore } from '$lib/stores/posthog.svelte';
	import type { SudokuGame } from '$lib/wasm/loader';

	interface Props {
		game: SudokuGame | null;
	}

	let { game }: Props = $props();
	let label = $state('Share');

	async function handleShare() {
		if (!game) return;

		const sc = game.get_short_code();
		const ps = game.get_puzzle_string();
		if (!sc && !ps) return;

		const baseUrl = window.location.origin;
		const shareUrl = sc ? `${baseUrl}/play/?s=${sc}` : `${baseUrl}/play/?p=${ps}`;
		const difficulty = game.difficulty();

		if (sc) {
			apiClient.registerShare({
				short_code: sc,
				puzzle_string: ps,
				difficulty,
				se_rating: game.se_rating(),
				platform: 'web',
				player_id: playerStore.id || 'anon'
			});
		}

		posthogStore.captureEvent('puzzle_shared', { difficulty, short_code: sc });

		const shareData = {
			title: `Sudoku Puzzle — ${difficulty}`,
			text: `Try this ${difficulty} Sudoku puzzle on Ukodus!`,
			url: shareUrl
		};

		if (navigator.share && navigator.canShare?.(shareData)) {
			try {
				await navigator.share(shareData);
				label = 'Shared!';
				setTimeout(() => { label = 'Share'; }, 2000);
				return;
			} catch (e: unknown) {
				if (e instanceof Error && e.name === 'AbortError') return;
			}
		}

		try {
			await navigator.clipboard.writeText(shareUrl);
		} catch {
			const ta = document.createElement('textarea');
			ta.value = shareUrl;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}
		label = 'Copied!';
		setTimeout(() => { label = 'Share'; }, 2000);
	}
</script>

<button class="share-btn" disabled={!game} onclick={handleShare} aria-live="polite">{label}</button>

<style>.share-btn { min-height: 44px; padding: 10px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 12px; transition: background 180ms ease; } .share-btn:hover:not(:disabled) { background: var(--surface-hover); }</style>
