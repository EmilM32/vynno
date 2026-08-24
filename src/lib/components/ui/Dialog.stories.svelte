<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';

	const { Story } = defineMeta({
		title: 'UI/Dialog',
		component: Dialog,
		parameters: { layout: 'fullscreen' },
		args: {
			open: true,
			title: 'Rename project',
			size: 'md',
			onclose: fn()
		}
	});
</script>

<Story name="Open">
	{#snippet template(args)}
		<Dialog {...args}>
			{#snippet children({ close })}
				<p class="text-body-md text-on-surface-variant">
					Dialog body. Escape, scrim, and the button all run the close callback after the exit
					animation.
				</p>
				<Button variant="secondary" class="mt-4" onclick={() => close()}>Close</Button>
			{/snippet}
		</Dialog>
	{/snippet}
</Story>

<Story name="Large" args={{ size: 'lg', title: 'Edit session' }}>
	{#snippet template(args)}
		<Dialog {...args}>
			{#snippet children({ close })}
				<p class="text-body-md text-on-surface-variant">Large panel (`max-w-lg`).</p>
				<Button variant="primary" class="mt-4" onclick={() => close()}>Done</Button>
			{/snippet}
		</Dialog>
	{/snippet}
</Story>
