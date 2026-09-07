<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { insightRangeForGrain } from '$lib/time/duration';
	import InsightRangeControl from './InsightRangeControl.svelte';

	const now = new Date(2026, 2, 11, 15, 30, 0);

	const { Story } = defineMeta({
		title: 'Insights/InsightRangeControl',
		component: InsightRangeControl,
		args: {
			now,
			range: insightRangeForGrain('week', now, now)
		}
	});
</script>

<Story name="Week" />

<Story name="Two weeks" args={{ range: insightRangeForGrain('twoWeeks', now, now) }} />

<Story name="Month" args={{ range: insightRangeForGrain('month', now, now) }} />
