<script lang="ts">
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
	<div class="tag-overlay">
		<div class="tag-panel">
			<h2>Enter Your Tag</h2>
			<input
				type="text"
				maxlength="6"
				placeholder="ACE"
				autocomplete="off"
				spellcheck="false"
				bind:value
				oninput={validate}
				onkeydown={handleKeydown}
			/>
			<p class="tag-hint">3-6 characters &middot; A-Z 0-9</p>
			<p class="tag-error">{error}</p>
			<button disabled={!isValid} onclick={submit}>START</button>
		</div>
	</div>
{/if}

<style>
	.tag-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(10, 10, 15, 0.65);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.tag-panel {
		width: min(380px, calc(100vw - 32px));
		padding: 36px 32px 28px;
		background: #1a1a2e;
		border-radius: 16px;
		border: 1.5px solid rgba(120, 100, 255, 0.3);
		box-shadow: 0 0 40px rgba(120, 100, 255, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4);
		text-align: center;
	}
	.tag-panel h2 {
		font-family: var(--mono);
		font-size: 20px;
		letter-spacing: 4px;
		color: #e0d8ff;
		margin: 0 0 24px;
		text-transform: uppercase;
	}
	.tag-panel input {
		display: block;
		width: 100%;
		box-sizing: border-box;
		font-family: var(--mono);
		font-size: 28px;
		letter-spacing: 6px;
		text-align: center;
		text-transform: uppercase;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.06);
		border: 1.5px solid rgba(120, 100, 255, 0.35);
		border-radius: 10px;
		color: #fff;
		outline: none;
		transition: border-color 200ms ease;
	}
	.tag-panel input::placeholder {
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 6px;
	}
	.tag-panel input:focus {
		border-color: rgba(120, 100, 255, 0.7);
	}
	.tag-hint {
		font-family: var(--mono);
		font-size: 11px;
		color: rgba(255, 255, 255, 0.35);
		margin: 10px 0 20px;
	}
	.tag-error {
		font-family: var(--mono);
		font-size: 11px;
		color: #ff6b6b;
		margin: -6px 0 14px;
		min-height: 16px;
	}
	.tag-panel button {
		font-family: var(--mono);
		font-size: 14px;
		letter-spacing: 3px;
		text-transform: uppercase;
		padding: 12px 40px;
		border-radius: 999px;
		border: 1.5px solid rgba(120, 100, 255, 0.4);
		background: linear-gradient(180deg, rgba(120, 100, 255, 0.2), rgba(120, 100, 255, 0.05));
		color: #e0d8ff;
		cursor: pointer;
		transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
	}
	.tag-panel button:hover:not(:disabled) {
		transform: translateY(-1px);
		background: linear-gradient(180deg, rgba(120, 100, 255, 0.35), rgba(120, 100, 255, 0.1));
		border-color: rgba(120, 100, 255, 0.6);
	}
	.tag-panel button:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
</style>
