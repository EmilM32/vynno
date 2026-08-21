<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { makeSession } from '$lib/test/factories';
	import StoryProviders from '$lib/storybook/StoryProviders.svelte';
	import LogRow from './LogRow.svelte';

	const { Story } = defineMeta({
		title: 'Logs/LogRow',
		component: LogRow,
		args: {
			session: makeSession({
				note: 'Wire session hydrate',
				activityTypeId: 'act-deep'
			}),
			hideProject: false,
			onedit: fn(),
			ondelete: fn()
		}
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<StoryProviders>
			<LogRow {...args} />
		</StoryProviders>
	{/snippet}
</Story>

<Story name="HideProject" args={{ hideProject: true }}>
	{#snippet template(args)}
		<StoryProviders>
			<LogRow {...args} />
		</StoryProviders>
	{/snippet}
</Story>

<Story name="ReadOnly" args={{ onedit: undefined, ondelete: undefined }}>
	{#snippet template(args)}
		<StoryProviders>
			<LogRow {...args} />
		</StoryProviders>
	{/snippet}
</Story>
