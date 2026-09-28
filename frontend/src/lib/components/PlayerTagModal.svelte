<script lang="ts">
	import { modalFocus } from '$lib/actions/modalFocus';
	import { playerStore } from '$lib/stores/player.svelte';
	import { posthogStore } from '$lib/stores/posthog.svelte';

	interface Props {
		open: boolean;
		onclose: (tag: string | null) => void;
	}

	let { open, onclose }: Props = $props();

	const TAG_RE = /^[A-Z0-9]{3,6}$/;
	let value = $state('');
	let error = $state('');

	$effect(() => {
		if (open) {
			value = playerStore.tag || '';
			error = '';
		}
	});

	function validate() {
		value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (value.length > 0 && value.length < 3) {
			error = 'Too short — need at least 3';
		} else if (!TAG_RE.test(value) && value.length >= 3) {
			error = 'A-Z and 0-9 only';
		} else {
			error = '';
		}
	}

	function submit() {
		const val = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (!TAG_RE.test(val)) return;
		playerStore.setTag(val);
		posthogStore.captureEvent('player_tag_set', { tag: val });
		posthogStore.identifyPlayer(playerStore.id, val);
		onclose(val);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}

	let isValid = $derived(TAG_RE.test(value));
</script>

{#if open}
	<div class="tag-overlay" role="dialog" aria-modal="true" aria-labelledby="tag-title" tabindex="-1" use:modalFocus={() => onclose(null)}>
		<div class="tag-panel">
			<p class="dialog-kicker">Your place on the leaderboard</p>
			<h2 id="tag-title">Enter Your Tag</h2>
			<p class="tag-intro">A name for your best times. No account needed.</p>
			<label for="player-tag">Player tag</label>
			<input
				id="player-tag"
				type="text"
				aria-describedby="tag-hint tag-error"
				aria-invalid={!!error}
				maxlength="6"
				placeholder="ACE"
				autocomplete="off"
				spellcheck="false"
				bind:value
				oninput={validate}
				onkeydown={handleKeydown}
			/>
			<p class="tag-hint" id="tag-hint">3-6 characters &middot; A-Z 0-9</p>
			<p class="tag-error" id="tag-error" aria-live="polite">{error}</p>
			<div class="tag-actions"><button class="btn primary" disabled={!isValid} onclick={submit}>START</button><button class="btn" onclick={() => onclose(null)}>Cancel</button></div>
		</div>
	</div>
{/if}

<style>
	.tag-overlay { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 24px; background: #18151080; backdrop-filter: blur(6px); }
	.tag-panel { width: min(420px, 100%); max-height: calc(100dvh - 48px); overflow-y: auto; padding: 32px; border-radius: 20px; border: 1px solid var(--border); background: var(--paper2); box-shadow: var(--shadow); }
	.dialog-kicker { margin: 0 0 16px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
	h2 { font-size: 32px; margin: 0 0 14px; }
	.tag-intro { font-size: 14px; line-height: 1.7; color: var(--muted); margin-bottom: 28px; }
	label { display: block; font-size: 12px; margin-bottom: 10px; }
	input { width: 100%; padding: 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--paper); color: var(--ink); font: 24px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; }
	input::placeholder { color: var(--faint); }
	input[aria-invalid='true'] { border-color: var(--error); }
	.tag-hint, .tag-error { font-size: 11px; line-height: 1.6; }
	.tag-hint { color: var(--muted); }
	.tag-error { min-height: 18px; color: var(--error); }
	.tag-actions { display: flex; gap: 12px; }
	.tag-actions .primary { flex: 1; }
	@media (max-width: 420px) { .tag-overlay { padding: 16px; } .tag-panel { padding: 24px; } }
</style>
