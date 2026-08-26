<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import OverlayCanvas from '$lib/storybook/OverlayCanvas.svelte';
	import Button from './Button.svelte';
	import Dialog from './Dialog.svelte';

	const { Story } = defineMeta({
		title: 'UI/Dialog',
		component: Dialog,
		parameters: {
			layout: 'fullscreen',
			docs: { story: { inline: false, iframeHeight: 480 } }
		},
		args: {
			title: 'Rename project',
			size: 'md',
			onclose: fn()
		},
		argTypes: {
			children: { table: { disable: true } },
			open: { table: { disable: true } },
			onclose: { table: { disable: true } },
			initialFocus: { table: { disable: true } }
		}
	});

	// Pass props explicitly: `children` is a required snippet, so `{...args}`
	// would collide with the markup. OverlayCanvas owns `open` so close unmounts the trap.
</script>

<Story name="Open">
	{#snippet template(args)}
		<OverlayCanvas initialOpen>
			{#snippet children({ open, close })}
				<Dialog
					{open}
					title={args.title}
					size={args.size}
					onclose={() => {
						close();
						args.onclose();
					}}
				>
					{#snippet children({ close })}
						<p class="text-body-md text-on-surface-variant">
							Dialog body. Escape, scrim, and the button all run the close callback after the exit
							animation.
						</p>
						<Button variant="secondary" class="mt-4" onclick={() => close()}>Close</Button>
					{/snippet}
				</Dialog>
			{/snippet}
		</OverlayCanvas>
	{/snippet}
</Story>

<Story name="Large" args={{ size: 'lg', title: 'Edit session' }}>
	{#snippet template(args)}
		<OverlayCanvas initialOpen>
			{#snippet children({ open, close })}
				<Dialog
					{open}
					title={args.title}
					size={args.size}
					onclose={() => {
						close();
						args.onclose();
					}}
				>
					{#snippet children({ close })}
						<p class="text-body-md text-on-surface-variant">Large panel (`max-w-lg`).</p>
						<Button variant="primary" class="mt-4" onclick={() => close()}>Done</Button>
					{/snippet}
				</Dialog>
			{/snippet}
		</OverlayCanvas>
	{/snippet}
</Story>
