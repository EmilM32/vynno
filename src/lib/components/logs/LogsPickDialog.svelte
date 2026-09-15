<script lang="ts" module>
	export type { LogsPickItem } from './LogsPickList.svelte';
</script>

<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import LogsPickList, { type LogsPickItem } from './LogsPickList.svelte';

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

	function apply(close: (then?: () => void) => void) {
		const ids = selected;
		close(() => onapply(ids));
	}
</script>

<Dialog {open} {title} {onclose}>
	{#snippet children({ close })}
		<div class="flex flex-col gap-4">
			<LogsPickList {items} bind:selected ariaLabel={title} />
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
