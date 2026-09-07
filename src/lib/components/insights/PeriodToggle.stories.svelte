<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PeriodToggle from './PeriodToggle.svelte';

	const options = [
		{ id: 'week', label: 'Week' },
		{ id: 'twoWeeks', label: '2 weeks' },
		{ id: 'month', label: 'Month' }
	];

	const { Story } = defineMeta({
		title: 'Insights/PeriodToggle',
		component: PeriodToggle,
		args: {
			value: 'week',
			options
		}
	});
</script>

<Story name="Default" />

<Story name="Month" args={{ value: 'month', options }} />
