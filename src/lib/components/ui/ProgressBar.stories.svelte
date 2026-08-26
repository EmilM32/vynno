<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProgressBar from './ProgressBar.svelte';

	const { Story } = defineMeta({
		title: 'UI/ProgressBar',
		component: ProgressBar,
		args: {
			value: 42,
			label: 'Logged this week',
			size: 'md',
			fill: 'primary'
		}
	});
</script>

<Story name="Default" />

<Story name="States">
	{#snippet template()}
		<div class="flex max-w-sm flex-col gap-4">
			<ProgressBar value={0} label="Empty" size="sm" />
			<ProgressBar value={42} label="Partial" />
			<ProgressBar value={100} label="At target" fill="secondary" size="sm" />
			<ProgressBar value={72} label="Project colour" fill="#8b5cf6" />
		</div>
	{/snippet}
</Story>
