<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import type { ComponentProps } from 'svelte';
	import OverlayCanvas from '$lib/storybook/OverlayCanvas.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';

	type Args = Omit<ComponentProps<typeof ConfirmDialog>, 'open'>;

	const { Story } = defineMeta({
		title: 'UI/ConfirmDialog',
		component: ConfirmDialog,
		parameters: {
			layout: 'fullscreen',
			docs: {
				story: { inline: false, iframeHeight: 480 },
				description: {
					component:
						'One yes/no decision with no input. Every irreversible delete goes through it with `destructive` \u2014 the confirm becomes `danger-filled` and Cancel gets focus. Rules: [overlays.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/overlays.md#confirmdialog).'
				}
			}
		},
		args: {
			title: 'Stop session?',
			message: 'Elapsed time is saved. You can edit the log later.',
			onconfirm: fn(),
			oncancel: fn()
		},
		argTypes: {
			open: { table: { disable: true } },
			onconfirm: { table: { disable: true } },
			oncancel: { table: { disable: true } }
		}
	});
</script>

{#snippet template(args: Args)}
	<OverlayCanvas initialOpen>
		{#snippet children({ open, close })}
			<ConfirmDialog
				{open}
				title={args.title}
				message={args.message}
				destructive={args.destructive}
				onconfirm={() => {
					close();
					args.onconfirm();
				}}
				oncancel={() => {
					close();
					args.oncancel();
				}}
			/>
		{/snippet}
	</OverlayCanvas>
{/snippet}

<Story name="Default" {template} />

<Story
	name="Destructive"
	args={{
		title: 'Delete project?',
		message: 'This cannot be undone. Sessions stay in the log as unknown project.',
		destructive: true
	}}
	{template}
/>
