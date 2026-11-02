<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const spacing = [
		['gap-1', 'w-1', '4px', 'Icon and its label'],
		['gap-2', 'w-2', '8px', 'Items in a row, buttons in a group (default)'],
		['gap-3', 'w-3', '12px', 'Fields, KPI grid (= gap-gutter)'],
		['gap-4', 'w-4', '16px', 'Fields in a form, cards in a grid'],
		['gap-5', 'w-5', '20px', 'Split rows in a Settings card'],
		['gap-6', 'w-6', '24px', 'Sections of a screen'],
		['gap-8', 'w-8', '32px', 'Sections on Settings and Timer']
	] as const;

	const radii = [
		['rounded-lg', '8px', 'Card, panel, empty state'],
		['rounded-DEFAULT', '4px', 'Row, tile, control'],
		['rounded-sm', '2px', 'ActivityChip, near-square tag'],
		['rounded-full', '—', 'Dots and avatars only']
	] as const;

	const { Story } = defineMeta({
		title: 'Foundations/Layout',
		parameters: {
			docs: {
				description: {
					component:
						'4px unit, dense screens, flat elevation: depth is a lighter surface plus a 1px hairline, never a shadow. Rules and recipes: [docs/design-system/layout.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/layout.md).'
				}
			}
		}
	});
</script>

<Story name="Spacing">
	{#snippet template()}
		<ul class="flex flex-col gap-2">
			{#each spacing as [name, bar, px, use] (name)}
				<li class="grid grid-cols-[6rem_3rem_2.5rem_1fr] items-center gap-3">
					<span class="font-mono text-code-label text-on-surface">{name}</span>
					<span class="font-mono text-code-label text-on-surface-variant">{px}</span>
					<span class="h-4 {bar} bg-primary"></span>
					<span class="text-body-sm text-on-surface-variant">{use}</span>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story name="Radius">
	{#snippet template()}
		<div class="grid gap-3 sm:grid-cols-4">
			{#each radii as [name, px, use] (name)}
				<div class="flex flex-col gap-2">
					<div class="h-16 border border-outline-variant bg-surface-container {name}"></div>
					<p class="font-mono text-code-label text-on-surface">{name} · {px}</p>
					<p class="text-body-sm text-on-surface-variant">{use}</p>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Elevation">
	{#snippet template()}
		<div class="flex flex-col gap-4 rounded-lg bg-surface p-4">
			<p class="font-mono text-code-label text-on-surface-variant">0 · page — bg-surface</p>
			<div class="rounded-lg border border-outline-variant bg-surface-container p-4">
				<p class="font-mono text-code-label text-on-surface-variant">
					1 · card — bg-surface-container + border-outline-variant
				</p>
				<div
					class="mt-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3"
				>
					<p class="font-mono text-code-label text-on-surface-variant">
						row inside a card — bg-surface-container-low
					</p>
				</div>
				<div class="mt-3 rounded-DEFAULT border border-primary bg-surface-container-low p-3">
					<p class="font-mono text-code-label text-primary">
						active — border-primary, no lift, no shadow
					</p>
				</div>
			</div>
			<p class="text-body-sm text-on-surface-variant">
				2 · overlays (Dialog, Drawer, CommandPalette, row menus) are the only elements with a
				shadow.
			</p>
		</div>
	{/snippet}
</Story>
