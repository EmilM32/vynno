<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import { PROJECT_COLOR_LABEL_KEY, PROJECT_COLOR_PALETTE } from '$lib/projects/palette';
	import {
		ACTIVITY_COLOR_TOKENS,
		activityChipClass,
		activityColorLabel
	} from '$lib/time/activity-styles';

	const surfaces = [
		['surface', 'bg-surface'],
		['surface-container-low', 'bg-surface-container-low'],
		['surface-container', 'bg-surface-container'],
		['surface-container-high', 'bg-surface-container-high'],
		['surface-container-highest', 'bg-surface-container-highest']
	] as const;

	const accents = [
		['primary', 'bg-primary text-on-primary'],
		['primary-container', 'bg-primary-container text-on-primary-container'],
		['secondary', 'bg-secondary text-on-secondary'],
		['secondary-container', 'bg-secondary-container text-on-secondary-container'],
		['tertiary', 'bg-tertiary text-on-tertiary'],
		['error', 'bg-error text-on-error'],
		['error-container', 'bg-error-container text-on-error-container']
	] as const;

	/** Text inks, most-used first. `outline*` is deliberately absent: it fails 4.5:1 as text. */
	const inks = [
		['on-surface', 'text-on-surface', 'Main content: names, values, titles'],
		['on-surface-variant', 'text-on-surface-variant', 'Meta, labels, captions, hints'],
		['primary', 'text-primary', 'Accent: active nav, links, saved confirmation'],
		['secondary', 'text-secondary', 'Running, target met, positive delta'],
		['tertiary', 'text-tertiary', 'Paused, warning, negative delta'],
		['error', 'text-error', 'Errors and destructive state']
	] as const;

	const borders = [
		['outline-variant', 'border-outline-variant', 'Every card, row and divider'],
		['outline', 'border-outline', 'Hovered card or row'],
		['primary', 'border-primary', 'Active or selected element'],
		['outline-variant dashed', 'border-dashed border-outline-variant', 'Empty state']
	] as const;

	const { Story } = defineMeta({
		title: 'Foundations/Colors',
		parameters: {
			docs: {
				description: {
					component:
						'Semantic colour utilities only — never a hex, `var(--dt-*)` or a Tailwind palette colour. Switch themes in the toolbar: every swatch here must still read. Rules and the background/text decision trees: [docs/design-system/colors.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/colors.md).'
				}
			}
		}
	});
</script>

<Story name="Surfaces">
	{#snippet template()}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each surfaces as [name, swatch] (name)}
				<div class="overflow-hidden rounded-lg border border-outline-variant">
					<div class="h-16 {swatch}"></div>
					<p class="bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface">
						{name}
					</p>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Accents">
	{#snippet template()}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each accents as [name, swatch] (name)}
				<div
					class="flex min-h-16 items-center rounded-lg border border-outline-variant px-4 py-3 font-mono text-code-label {swatch}"
				>
					{name}
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Text">
	{#snippet template()}
		<ul class="flex flex-col gap-2">
			{#each inks as [name, ink, use] (name)}
				<li
					class="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-DEFAULT border border-outline-variant bg-surface-container px-3 py-2"
				>
					<span class="w-44 font-mono text-code-label text-on-surface-variant">{name}</span>
					<span class="text-body-md {ink}">{use}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Borders">
	{#snippet template()}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each borders as [name, border, use] (name)}
				<div class="rounded-lg border bg-surface-container p-4 {border}">
					<p class="font-mono text-code-label text-on-surface">{name}</p>
					<p class="mt-1 text-body-sm text-on-surface-variant">{use}</p>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Activity types">
	{#snippet template()}
		<div class="flex flex-wrap gap-2">
			{#each ACTIVITY_COLOR_TOKENS as token (token)}
				<span
					class="inline-flex flex-col gap-1 rounded-DEFAULT border px-3 py-2 {activityChipClass(
						token
					)}"
				>
					<span class="font-mono text-code-label">{activityColorLabel(token)}</span>
					<span class="text-body-sm opacity-80">{token}</span>
				</span>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Project palette">
	{#snippet template()}
		<p class="mb-3 text-body-sm text-on-surface-variant">
			The only hex a component renders — user data from <code>PROJECT_COLOR_PALETTE</code>. Always
			next to the project name.
		</p>
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each PROJECT_COLOR_PALETTE as hex (hex)}
				<li
					class="flex items-center gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low px-3 py-2"
				>
					<ColorDot color={hex} size="md" />
					<span class="text-body-md text-on-surface">{PROJECT_COLOR_LABEL_KEY[hex].slice(6)}</span>
					<span class="ml-auto font-mono text-code-label text-on-surface-variant">{hex}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>
