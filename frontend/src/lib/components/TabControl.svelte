<script lang="ts">
	interface Tab {
		id: string;
		label: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab: string;
		onselect: (id: string) => void;
	}

	let { tabs, activeTab, onselect }: Props = $props();
	const buttons: HTMLButtonElement[] = [];

	function handleKeydown(e: KeyboardEvent, idx: number) {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
		e.preventDefault();
		const nextIdx = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 :
			e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
		onselect(tabs[nextIdx].id);
		buttons[nextIdx]?.focus();
	}
</script>

<div class="demo-tabs" role="tablist" aria-label="Demo platform">
	{#each tabs as tab, i}
		<button
			class="tab"
			bind:this={buttons[i]}
			id={`${tab.id}-tab`}
			aria-controls={tab.id}
			tabindex={activeTab === tab.id ? 0 : -1}
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			onclick={() => onselect(tab.id)}
			onkeydown={(e) => handleKeydown(e, i)}
		>
			{tab.label}
		</button>
	{/each}
</div>

<style>
	.demo-tabs { display: flex; flex-wrap: nowrap; gap: 4px; margin: 0; padding: 4px; border-radius: 10px; background: var(--grid); border: 1px solid var(--grid-strong); }
	.tab { min-width: 70px; min-height: 40px; padding: 8px 16px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--muted); font: 11px var(--mono); cursor: pointer; transition: background 180ms ease, color 180ms ease; }
	.tab:hover { transform: none; background: var(--grid); color: var(--ink); }
	.tab[aria-selected='true'] { background: var(--paper2); border-color: var(--grid-strong); color: var(--ink); box-shadow: 0 1px 3px #281c1610; }
</style>
