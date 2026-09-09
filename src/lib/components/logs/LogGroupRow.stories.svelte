<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { localIso, makeSession } from '$lib/test/factories';
	import { groupSessionsByTask } from '$lib/time/aggregates';
	import StoryProviders from '$lib/storybook/StoryProviders.svelte';
	import LogGroupRow from './LogGroupRow.svelte';

	const sessions = [
		makeSession({
			id: 'g1',
			ticketId: 'DEV-842',
			note: 'First pass',
			startedAt: localIso(2026, 2, 11, 9, 0),
			endedAt: localIso(2026, 2, 11, 10, 0)
		}),
		makeSession({
			id: 'g2',
			ticketId: 'DEV-842',
			note: 'Review comments',
			startedAt: localIso(2026, 2, 11, 11, 0),
			endedAt: localIso(2026, 2, 11, 12, 0)
		}),
		makeSession({
			id: 'g3',
			ticketId: 'DEV-842',
			note: 'QA fixes',
			startedAt: localIso(2026, 2, 11, 14, 0),
			endedAt: localIso(2026, 2, 11, 14, 30)
		})
	];
	const group = groupSessionsByTask(sessions)[0]!;

	const { Story } = defineMeta({
		title: 'Logs/LogGroupRow',
		component: LogGroupRow,
		args: {
			group,
			onedit: fn(),
			ondelete: fn()
		}
	});
</script>

<Story name="Collapsed">
	{#snippet template(args)}
		<StoryProviders>
			<LogGroupRow {...args} />
		</StoryProviders>
	{/snippet}
</Story>
