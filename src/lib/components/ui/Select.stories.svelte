<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Field from './Field.svelte';
	import Select, { type SelectSize } from './Select.svelte';

	const { Story } = defineMeta({
		title: 'UI/Select',
		component: Select,
		args: {
			size: 'md',
			disabled: false
		}
	});

	const SIZES: SelectSize[] = ['sm', 'md'];
</script>

{#snippet options()}
	<option value="auth">Identity</option>
	<option value="api">vynno-api</option>
	<option value="desk">Desktop shell</option>
{/snippet}

<Story name="Default">
	{#snippet template(args)}
		<Select size={args.size} disabled={args.disabled} class="w-56">
			{@render options()}
		</Select>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-end gap-3">
			{#each SIZES as size (size)}
				<Select {size} class="w-48">{@render options()}</Select>
			{/each}
			<Select disabled class="w-48">{@render options()}</Select>
		</div>
	{/snippet}
</Story>

<Story name="InField">
	{#snippet template()}
		<Field id="session-project" label="Project">
			<Select>{@render options()}</Select>
		</Field>
	{/snippet}
</Story>
