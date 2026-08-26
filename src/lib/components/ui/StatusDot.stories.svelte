<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatusDot, { type StatusDotTone } from './StatusDot.svelte';

	const { Story } = defineMeta({
		title: 'UI/StatusDot',
		component: StatusDot,
		args: {
			tone: 'active'
		}
	});

	const TONES: StatusDotTone[] = ['active', 'paused', 'idle', 'live'];
</script>

<Story name="Default" />

<!--
	`active` blinks; `live` glows. With reduced motion, `blink` is suppressed
	globally (layout.css) — confirm the dot stays secondary and fully opaque.
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
