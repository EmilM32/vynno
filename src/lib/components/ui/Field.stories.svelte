<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Field from './Field.svelte';
	import Input from './Input.svelte';
	import Select from './Select.svelte';

	const { Story } = defineMeta({
		title: 'UI/Field',
		component: Field,
		args: {
			id: 'story-field',
			label: 'Project name'
		}
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<Field id={args.id} label={args.label}>
			<Input />
		</Field>
	{/snippet}
</Story>

<Story name="Hint">
	{#snippet template()}
		<Field
			id="display-name"
			label="Display name"
			hint="Shown on the profile chip. The email stays as you registered."
		>
			<Input value="Ada" />
		</Field>
	{/snippet}
</Story>

<Story name="Error">
	{#snippet template()}
		<Field id="project-name" label="Name" error="Name is required.">
			<Input aria-invalid="true" />
		</Field>
	{/snippet}
</Story>

<!-- Settings preferences: label + hint on the left, control on the right. -->
<Story name="Split">
	{#snippet template()}
		<div class="max-w-xl">
			<Field
				id="daily-target"
				label="Daily hour target"
				hint="Used by Insights as the ‘vs target’ baseline. Local only for now."
				layout="split"
			>
				<Input type="number" tone="data" size="sm" class="sm:w-28" value="8" />
			</Field>
		</div>
	{/snippet}
</Story>

<Story name="SplitSelect">
	{#snippet template()}
		<div class="max-w-xl">
			<Field
				id="ui-theme"
				label="Appearance"
				hint="Named palettes, not a light/dark toggle."
				layout="split"
			>
				<Select class="sm:w-56">
					<option>Dev-Density Dark</option>
					<option>High-Density Light</option>
					<option>Deep Dark</option>
				</Select>
			</Field>
		</div>
	{/snippet}
</Story>
