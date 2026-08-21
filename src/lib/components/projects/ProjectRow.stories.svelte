<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { makeProject } from '$lib/test/factories';
	import ProjectRow from './ProjectRow.svelte';

	const handlers = {
		onedit: fn(),
		onarchive: fn(),
		onrestore: fn(),
		ondelete: fn()
	};

	const { Story } = defineMeta({
		title: 'Projects/ProjectRow',
		component: ProjectRow,
		args: {
			project: makeProject(),
			sessionCount: 12,
			canArchive: true,
			canDelete: true,
			busy: false,
			...handlers
		}
	});
</script>

<Story name="Active" />

<Story
	name="LastActive"
	args={{
		sessionCount: 0,
		canArchive: false,
		canDelete: false
	}}
/>

<Story
	name="Archived"
	args={{
		project: makeProject({ isArchived: true, name: 'Legacy API' }),
		sessionCount: 3,
		canArchive: false,
		canDelete: true
	}}
/>
