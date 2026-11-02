<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PROJECT_COLOR_PALETTE } from '$lib/projects/palette';
	import Field from './Field.svelte';
	import Select, { type SelectOption, type SelectSize } from './Select.svelte';

	const { Story } = defineMeta({
		title: 'UI/Select',
		component: Select,
		parameters: {
			docs: {
				description: {
					component:
						'A stored setting or form value from fixed options. A themed listbox on a fine pointer, the native picker on touch. Switching what the screen shows (period, layout) → `PeriodToggle` instead. A colour → the picker wrappers. Rules: [forms.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/forms.md#select).'
				}
			}
		},
		args: {
			size: 'md',
			disabled: false
		}
	});

	const SIZES: SelectSize[] = ['sm', 'md'];

	const OPTIONS: SelectOption[] = [
		{ value: 'auth', label: 'Identity' },
		{ value: 'api', label: 'vynno-api' },
		{ value: 'desk', label: 'Desktop shell' },
		{ value: 'legacy', label: 'Legacy importer', disabled: true }
	];

	const colourOf = (value: string) =>
		PROJECT_COLOR_PALETTE[OPTIONS.findIndex((o) => o.value === value)];
</script>

<Story name="Default">
	{#snippet template(args)}
		<Select size={args.size} disabled={args.disabled} options={OPTIONS} value="api" class="w-56" />
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-end gap-3">
			{#each SIZES as size (size)}
				<Select {size} options={OPTIONS} value="auth" class="w-48" />
			{/each}
			<Select disabled options={OPTIONS} value="auth" class="w-48" />
		</div>
	{/snippet}
</Story>

<Story name="InField">
	{#snippet template()}
		<Field id="session-project" label="Project">
			<Select options={OPTIONS} value="desk" />
		</Field>
	{/snippet}
</Story>

<Story name="CustomRow">
	{#snippet template()}
		<Field id="session-project-colour" label="Project">
			<Select options={OPTIONS} value="auth" class="w-56">
				{#snippet option(o)}
					<span
						class="size-2 shrink-0 rounded-full"
						style:background-color={colourOf(o.value)}
						aria-hidden="true"
					></span>
					<bdi class="min-w-0 truncate">{o.label}</bdi>
				{/snippet}
			</Select>
		</Field>
	{/snippet}
</Story>
