<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { makeProject } from '$lib/test/factories';
	import { STORY_ACTIVITY_TYPES, STORY_NOW } from '$lib/storybook/seed';
	import LogsFilterBar from './LogsFilterBar.svelte';

	const projects = [
		makeProject({ id: 'proj-auth', name: 'Identity', color: '#3b82f6', code: 'AUTH' }),
		makeProject({ id: 'proj-beta', name: 'Beta', color: '#8b5cf6', code: 'BETA' })
	];

	const { Story } = defineMeta({
		title: 'Logs/LogsFilterBar',
		component: LogsFilterBar,
		args: {
			datePreset: 'all' as const,
			customRange: null,
			projectIds: [] as string[],
			activityTypeIds: [] as string[],
			projects,
			activityTypes: STORY_ACTIVITY_TYPES,
			now: STORY_NOW
		}
	});
</script>

<Story name="Default" />

<Story
	name="Constrained"
	args={{
		datePreset: 'yesterday' as const,
		projectIds: ['proj-auth'],
		activityTypeIds: ['act-deep']
	}}
/>
