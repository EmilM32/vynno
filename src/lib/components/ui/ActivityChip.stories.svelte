<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ACTIVITY_COLOR_TOKENS, activityColorLabel } from '$lib/time/activity-styles';
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
				<ActivityChip type={{ id: color, name: activityColorLabel(color), color }} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Long name in a narrow row">
	{#snippet template()}
		<div
			class="flex w-[324px] items-center gap-2 rounded border border-outline-variant px-3 py-2"
			data-testid="narrow-row"
		>
			<ActivityChip type={{ id: 'act-long', name: 'A'.repeat(80), color: 'primary' }} />
			<span class="ml-auto shrink-0 text-body-sm" data-testid="row-actions">Edit · Delete</span>
		</div>
	{/snippet}
</Story>
