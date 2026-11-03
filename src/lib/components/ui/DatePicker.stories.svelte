<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DatePicker, { type DatePickerSize } from './DatePicker.svelte';
	import Field from './Field.svelte';

	const { Story } = defineMeta({
		title: 'UI/DatePicker',
		component: DatePicker,
		parameters: {
			docs: {
				description: {
					component:
						'A date, or a date and time, as a form value. A themed calendar popover on a fine pointer, the native picker on touch. Values are the native `YYYY-MM-DD` / `YYYY-MM-DDTHH:MM`. Rules: [forms.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/forms.md#datepicker).'
				}
			}
		},
		args: {
			size: 'md',
			disabled: false
		}
	});

	const SIZES: DatePickerSize[] = ['sm', 'md'];
</script>

<Story name="Default">
	{#snippet template(args)}
		<DatePicker
			size={args.size}
			disabled={args.disabled}
			value="2026-10-28"
			max="2026-11-03"
			class="w-56"
		/>
	{/snippet}
</Story>

<Story name="DateTime">
	{#snippet template()}
		<DatePicker mode="datetime" value="2026-11-02T23:40" max="2026-11-03T12:00" class="w-56" />
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-end gap-3">
			{#each SIZES as size (size)}
				<DatePicker {size} value="2026-10-28" class="w-48" />
			{/each}
			<DatePicker disabled value="2026-10-28" class="w-48" />
			<DatePicker class="w-48" />
		</div>
	{/snippet}
</Story>

<Story name="InField">
	{#snippet template()}
		<div class="grid max-w-md gap-4 sm:grid-cols-2">
			<Field id="range-from" label="From">
				<DatePicker value="2026-11-04" max="2026-11-03" class="w-full" />
			</Field>
			<Field id="range-to" label="To" error="From must be on or before To.">
				<DatePicker value="2026-11-01" max="2026-11-03" class="w-full" />
			</Field>
		</div>
	{/snippet}
</Story>
