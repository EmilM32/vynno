<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from '$lib/components/ui/Button.svelte';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import CommandPalette from './CommandPalette.svelte';

	const { Story } = defineMeta({
		title: 'Shell/CommandPalette',
		component: CommandPalette,
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Open">
	{#snippet template()}
		<div class="min-h-screen bg-surface p-4">
			<Button variant="primary" onclick={() => commandPalette.show()}>Open commands</Button>
			<CommandPalette />
		</div>
	{/snippet}
</Story>
