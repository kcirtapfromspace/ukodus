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

	function handleKeydown(e: KeyboardEvent, idx: number) {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		const nextIdx =
			e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
		onselect(tabs[nextIdx].id);
	}
</script>

<div class="demo-tabs" role="tablist">
	{#each tabs as tab, i}
		<button
			class="tab"
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
