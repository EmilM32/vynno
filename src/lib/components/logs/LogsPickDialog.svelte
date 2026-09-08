<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';

	export type LogsPickItem = {
		id: string;
		label: string;
		color?: string;
	};

	let {
		open,
		title,
		items,
		selected = $bindable(),
		onclose,
		onapply
	}: {
		open: boolean;
		title: string;
		items: LogsPickItem[];
		selected: string[];
		onclose: () => void;
		onapply: (ids: string[]) => void;
	} = $props();

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	function apply(close: (then?: () => void) => void) {
		const ids = selected;
		close(() => onapply(ids));
	}
</script>

<Dialog {open} {title} {onclose}>
	{#snippet children({ close })}
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1" role="group" aria-label={title}>
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
						{#if item.color}
							<ColorDot color={item.color} />
						{/if}
						<span class="min-w-0 truncate">{item.label}</span>
					</Button>
				{/each}
			</div>
			<div class="flex flex-wrap justify-end gap-2">
				<Button variant="secondary" onclick={() => close()}>
					{m.common_cancel()}
				</Button>
				<Button variant="primary" onclick={() => apply(close)}>
					{m.logs_filter_apply()}
				</Button>
			</div>
		</div>
	{/snippet}
</Dialog>
