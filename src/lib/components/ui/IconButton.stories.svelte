<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import IconButton from './IconButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/IconButton',
		component: IconButton,
		args: {
			icon: 'more_horiz',
			label: 'More actions',
			variant: 'ghost',
			size: 'md',
			disabled: false,
			onclick: fn()
		}
	});
</script>

<Story name="Default" />

<!--
	No `.press` on this primitive by design — docs/motion.md excludes icon-only row and
	table actions. Feedback is the colour hover plus the global focus ring.
-->
<Story name="Matrix">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			{#each ['ghost', 'bordered'] as const as variant (variant)}
				<div class="flex flex-col gap-2">
					<span class="font-mono text-code-label text-on-surface-variant">{variant}</span>
					<div class="flex flex-wrap items-center gap-3">
						<IconButton icon="settings" label="Settings" {variant} size="sm" />
						<IconButton icon="settings" label="Settings" {variant} size="md" />
						<IconButton icon="settings" label="Settings" {variant} size="md" fill selected />
						<IconButton icon="settings" label="Settings" {variant} disabled />
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- `sm` is exactly the WCAG 2.2 2.5.8 floor (24px); `md` meets the 40px mobile target. -->
<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-wrap items-center gap-3">
			<IconButton {...args} size="sm" />
			<IconButton {...args} size="md" />
		</div>
	{/snippet}
</Story>

<Story name="Bordered" args={{ variant: 'bordered' }} />

<Story name="AsLink">
	{#snippet template()}
		<IconButton icon="open_in_new" label="Open timer" variant="bordered" href="#top" size="sm" />
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }} />
