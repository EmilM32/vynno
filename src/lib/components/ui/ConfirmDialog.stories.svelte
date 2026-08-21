<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import ConfirmDialog from './ConfirmDialog.svelte';

	const { Story } = defineMeta({
		title: 'UI/ConfirmDialog',
		component: ConfirmDialog,
		parameters: { layout: 'fullscreen' },
		args: {
			open: true,
			title: 'Stop session?',
			message: 'Elapsed time is saved. You can edit the log later.',
			onconfirm: fn(),
			oncancel: fn()
		}
	});
</script>

<Story name="Default" />

<Story
	name="Destructive"
	args={{
		title: 'Delete project?',
		message: 'This cannot be undone. Sessions stay in the log as unknown project.',
		destructive: true
	}}
/>
