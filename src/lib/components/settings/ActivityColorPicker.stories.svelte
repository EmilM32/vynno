<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import ActivityColorPicker from './ActivityColorPicker.svelte';

	const { Story } = defineMeta({
		title: 'Settings/ActivityColorPicker',
		component: ActivityColorPicker,
		args: {
			value: 'primary',
			onchange: fn()
		}
	});
</script>

<Story name="Default" />
