<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Icon from '$lib/components/ui/Icon.svelte';
	import fetchFonts from '../../../scripts/fetch-fonts?raw';

	/** The self-hosted subset. A name outside it renders as literal text, not a glyph. */
	const ICON_NAMES = (/ICON_NAMES='([^']+)'/.exec(fetchFonts)?.[1] ?? '').split(',').sort();

	const { Story } = defineMeta({
		title: 'Foundations/Icons',
		parameters: {
			docs: {
				description: {
					component:
						'Every Material Symbols name in the self-hosted subset (`ICON_NAMES` in `scripts/fetch-fonts`). Any other name shows as text. To add one: append it there and re-run `scripts/fetch-fonts`. Usage: [docs/design-system/buttons.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/buttons.md#icon).'
				}
			}
		}
	});
</script>

<Story name="Subset">
	{#snippet template()}
		<p class="mb-4 font-mono text-code-label text-on-surface-variant">
			{ICON_NAMES.length} icons
		</p>
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
			{#each ICON_NAMES as name (name)}
				<li
					class="flex flex-col items-center gap-2 rounded-DEFAULT border border-outline-variant bg-surface-container-low px-2 py-3"
				>
					<Icon {name} size="2xl" class="text-on-surface" />
					<span class="max-w-full truncate font-mono text-code-label text-on-surface-variant"
						>{name}</span
					>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>
