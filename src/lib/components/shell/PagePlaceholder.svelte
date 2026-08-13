<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import PageHeader from './PageHeader.svelte';

	let {
		title,
		description,
		phaseNote
	}: {
		title: string;
		description: string;
		phaseNote?: string;
	} = $props();

	const note = $derived(phaseNote ?? m.placeholder_phase_note());
</script>

<div class="flex flex-col gap-4">
	<PageHeader {title} {description} />

	<div
		class="rounded-lg border border-outline-variant bg-surface-container p-6 font-mono text-code-label text-on-surface-variant"
	>
		<p class="text-primary">{m.placeholder_scaffold()}</p>
		<p class="mt-2">{note}</p>
		<p class="mt-4 text-[11px] text-on-surface-variant">
			{m.placeholder_design_ref()}
		</p>
	</div>
</div>
