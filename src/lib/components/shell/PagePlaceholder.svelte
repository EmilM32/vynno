<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

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
	<div class="border-b border-outline-variant pb-4">
		<h1 class="text-headline-lg text-on-surface">{title}</h1>
		<p class="mt-1 text-body-md text-on-surface-variant">{description}</p>
	</div>

	<div
		class="rounded-lg border border-outline-variant bg-surface-container p-6 font-mono text-code-label text-on-surface-variant"
	>
		<p class="text-primary">{m.placeholder_scaffold()}</p>
		<p class="mt-2">{note}</p>
		<p class="mt-4 text-[11px] text-outline">
			{m.placeholder_design_ref()}
		</p>
	</div>
</div>
