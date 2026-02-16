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

<button class="share-btn" onclick={handleShare}>{label}</button>

<style>
	.share-btn {
		font-family: var(--mono);
		font-size: 11px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1px solid rgba(255, 59, 48, 0.25);
		background: linear-gradient(180deg, rgba(255, 59, 48, 0.08), rgba(255, 255, 255, 0.55));
		cursor: pointer;
		transition: transform 140ms ease, background 140ms ease;
		color: var(--ink);
	}
	.share-btn:hover {
		transform: translateY(-1px);
		background: linear-gradient(180deg, rgba(255, 59, 48, 0.14), rgba(255, 255, 255, 0.85));
	}
</style>
