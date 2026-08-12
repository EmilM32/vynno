<script lang="ts">
	let {
		title,
		description,
		phaseNote = 'Feature UI arrives in a later phase.'
	}: {
		title: string;
		description: string;
		phaseNote?: string;
	} = $props();
</script>

<div class="flex flex-col gap-4">
	<div class="border-b border-outline-variant pb-4">
		<h1 class="text-headline-lg text-on-surface">{title}</h1>
		<p class="mt-1 text-body-md text-on-surface-variant">{description}</p>
	</div>

	<div
		class="rounded-lg border border-outline-variant bg-surface-container p-6 font-mono text-code-label text-on-surface-variant"
	>
		<p class="text-primary">// scaffold placeholder</p>
		<p class="mt-2">{phaseNote}</p>
		<p class="mt-4 text-[11px] text-outline">
			Design reference: stitch_personal_dev_tracker/ · docs/screens-and-flows.md
		</p>
	</div>
</div>
