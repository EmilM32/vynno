<script lang="ts" module>
	export type LogsPickItem = {
		id: string;
		label: string;
		color?: string;
		/** Extra classes on the dot — lets a colorless row keep the mark's width. */
		dotClass?: string;
	};
</script>

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		items,
		selected = $bindable(),
		ariaLabel
	}: {
		items: LogsPickItem[];
		selected: string[];
		ariaLabel: string;
	} = $props();

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}
</script>

<div class="flex flex-col gap-1" role="group" aria-label={ariaLabel}>
	<Button
		variant="tab"
		size="sm"
		justify="start"
		class="w-full"
		selected={selected.length === 0}
		aria-pressed={selected.length === 0}
		onclick={() => (selected = [])}
	>
		{m.logs_filter_any()}
	</Button>
	{#each items as item (item.id)}
		<Button
			variant="tab"
			size="sm"
			justify="start"
			class="w-full"
			selected={selected.includes(item.id)}
			aria-pressed={selected.includes(item.id)}
			data-testid="logs-filter-option"
			onclick={() => toggle(item.id)}
		>
			{#if item.color || item.dotClass}
				<ColorDot color={item.color ?? 'transparent'} class={item.dotClass ?? ''} />
			{/if}
			<span class="min-w-0 truncate">{item.label}</span>
		</Button>
	{/each}
</div>
