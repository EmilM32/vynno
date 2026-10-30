<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import OverlayCanvas from '$lib/storybook/OverlayCanvas.svelte';
	import Button from './Button.svelte';
	import Drawer from './Drawer.svelte';
	import Field from './Field.svelte';
	import Input from './Input.svelte';

	const { Story } = defineMeta({
		title: 'UI/Drawer',
		component: Drawer,
		parameters: {
			layout: 'fullscreen',
			docs: {
				story: { inline: false, iframeHeight: 640 },
				description: {
					component:
						'Bottom sheet. `Dialog` renders it below 40rem, so every modal is a drawer on phones without opting in (`mobile="dialog"` opts out). Drag the handle row down, tap the scrim, or press Escape to dismiss.'
				}
			}
		},
		globals: { viewport: { value: 'mobile1', isRotated: false } },
		args: {
			title: 'Rename project',
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
		<OverlayCanvas initialOpen triggerLabel="Open drawer">
			{#snippet children({ open, close })}
				<Drawer
					{open}
					title={args.title}
					onclose={() => {
						close();
						args.onclose();
					}}
				>
					{#snippet children({ close })}
						<p class="text-body-md text-on-surface-variant">
							Drawer body. Dragging the handle row down, the scrim, Escape and the buttons all run
							the close callback after the exit.
						</p>
						<div class="dialog-actions mt-5 flex justify-end gap-2">
							<Button variant="secondary" onclick={() => close()}>Cancel</Button>
							<Button variant="primary" onclick={() => close()}>Save</Button>
						</div>
					{/snippet}
				</Drawer>
			{/snippet}
		</OverlayCanvas>
	{/snippet}
</Story>

<Story name="Long form" args={{ title: 'Edit session' }}>
	{#snippet template(args)}
		<OverlayCanvas initialOpen triggerLabel="Open drawer">
			{#snippet children({ open, close })}
				<Drawer
					{open}
					title={args.title}
					onclose={() => {
						close();
						args.onclose();
					}}
				>
					{#snippet children({ close })}
						<div class="flex flex-col gap-4">
							{#each ['Task', 'Project', 'Activity', 'Start', 'End', 'Note'] as label (label)}
								<Field id={`story-${label.toLowerCase()}`} {label}>
									<Input />
								</Field>
							{/each}
						</div>
						<div class="dialog-actions mt-5 flex justify-end gap-2">
							<Button variant="quiet" class="dialog-actions-aside" onclick={() => close()}>
								Delete session
							</Button>
							<Button variant="secondary" onclick={() => close()}>Cancel</Button>
							<Button variant="primary" onclick={() => close()}>Save</Button>
						</div>
					{/snippet}
				</Drawer>
			{/snippet}
		</OverlayCanvas>
	{/snippet}
</Story>
