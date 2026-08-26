<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import { PROJECT_COLOR_PALETTE } from '$lib/projects/palette';
	import { ACTIVITY_COLOR_TOKENS, activitySwatchClass } from '$lib/time/activity-styles';
	import SwatchPicker from './SwatchPicker.svelte';

	const hexOptions = PROJECT_COLOR_PALETTE.map((color) => ({
		value: color,
		label: color,
		color
	}));

	const tokenOptions = ACTIVITY_COLOR_TOKENS.map((token) => ({
		value: token,
		label: token,
		className: activitySwatchClass(token)
	}));

	const { Story } = defineMeta({
		title: 'UI/SwatchPicker',
		component: SwatchPicker,
		args: {
			value: PROJECT_COLOR_PALETTE[0],
			options: hexOptions,
			label: 'Project colour',
			onchange: fn()
		}
	});
</script>

<Story name="Default" />

<Story name="Hex">
	{#snippet template(args)}
		<SwatchPicker
			value={args.value}
			options={hexOptions}
			label="Project colour"
			onchange={args.onchange}
			compare={(a, b) => a.toLowerCase() === b.toLowerCase()}
		/>
	{/snippet}
</Story>

<Story name="Tokens">
	{#snippet template()}
		<SwatchPicker value="primary" options={tokenOptions} label="Activity colour" onchange={fn()} />
	{/snippet}
</Story>
