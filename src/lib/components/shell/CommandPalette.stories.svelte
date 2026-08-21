<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
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
			<button
				type="button"
				class="press focus-ring min-h-10 rounded bg-primary px-3 py-2 text-body-md font-medium text-on-primary"
				onclick={() => commandPalette.show()}
			>
				Open commands
			</button>
			<CommandPalette />
		</div>
	{/snippet}
</Story>
