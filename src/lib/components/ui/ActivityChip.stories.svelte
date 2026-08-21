<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ACTIVITY_COLOR_TOKENS } from '$lib/time/activity-styles';
	import ActivityChip from './ActivityChip.svelte';

	const { Story } = defineMeta({
		title: 'UI/ActivityChip',
		component: ActivityChip,
		args: {
			type: { id: 'act-deep', name: 'Deep Work', color: 'primary' }
		}
	});
</script>

<Story name="Default" />

<Story name="Tokens">
	{#snippet template()}
		<div class="flex flex-wrap gap-2">
			{#each ACTIVITY_COLOR_TOKENS as color (color)}
				<ActivityChip type={{ id: color, name: color, color }} />
			{/each}
		</div>
	{/snippet}
</Story>
