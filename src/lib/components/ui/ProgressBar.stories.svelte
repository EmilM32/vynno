<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProgressBar from './ProgressBar.svelte';

	const { Story } = defineMeta({
		title: 'UI/ProgressBar',
		component: ProgressBar,
		parameters: {
			docs: {
				description: {
					component:
						'Progress toward a target; `label` is required. `fill`: `primary`, `secondary` when the target is met, or a project hex. Rules: [display.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/display.md#progressbar).'
				}
			}
		},
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
