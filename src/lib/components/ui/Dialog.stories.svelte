<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
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
				<button
					type="button"
					class="press focus-ring mt-4 min-h-10 rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface hover:border-outline"
					onclick={() => close()}
				>
					Close
				</button>
			{/snippet}
		</Dialog>
	{/snippet}
</Story>

<Story name="Large" args={{ size: 'lg', title: 'Edit session' }}>
	{#snippet template(args)}
		<Dialog {...args}>
			{#snippet children({ close })}
				<p class="text-body-md text-on-surface-variant">Large panel (`max-w-lg`).</p>
				<button
					type="button"
					class="press focus-ring mt-4 min-h-10 rounded bg-primary px-3 py-2 text-body-md font-medium text-on-primary"
					onclick={() => close()}
				>
					Done
				</button>
			{/snippet}
		</Dialog>
	{/snippet}
</Story>
