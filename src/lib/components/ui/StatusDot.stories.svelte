<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatusDot, { type StatusDotTone } from './StatusDot.svelte';

	const { Story } = defineMeta({
		title: 'UI/StatusDot',
		component: StatusDot,
		args: {
			tone: 'live'
		}
	});

	const TONES: StatusDotTone[] = ['live', 'idle'];
</script>

<Story name="Default" />

<!--
	`live` glows (`today-glow`). `idle` is a static fill.
-->
<Story name="Tones">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			{#each TONES as tone (tone)}
				<div class="flex items-center gap-2">
					<StatusDot {tone} />
					<span class="font-mono text-code-label text-on-surface-variant">{tone}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
