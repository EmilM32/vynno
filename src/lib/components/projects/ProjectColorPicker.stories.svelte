<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { PROJECT_COLOR_PALETTE } from '$lib/projects/palette';
	import ProjectColorPicker from './ProjectColorPicker.svelte';

	const { Story } = defineMeta({
		title: 'Projects/ProjectColorPicker',
		component: ProjectColorPicker,
		args: {
			value: PROJECT_COLOR_PALETTE[0],
			onchange: fn()
		}
	});
</script>

<Story name="Default" />
