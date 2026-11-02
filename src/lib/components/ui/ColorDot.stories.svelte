<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ColorDot, { type ColorDotSize } from './ColorDot.svelte';

	const { Story } = defineMeta({
		title: 'UI/ColorDot',
		component: ColorDot,
		parameters: {
			docs: {
				description: {
					component:
						'Project identity, always next to the project name. `sm` 8px circle in lists, `md` 14px square in row headers and legends. Rules: [display.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/display.md#colordot-and-statusdot).'
				}
			}
		},
		args: {
			color: '#3b82f6',
			size: 'sm'
		}
	});

	const SIZES: ColorDotSize[] = ['sm', 'md'];
</script>

<Story name="Default" />

<Story name="Sizes">
	{#snippet template()}
		<div class="flex items-center gap-4">
			{#each SIZES as size (size)}
				<div class="flex items-center gap-2">
					<ColorDot color="#3b82f6" {size} />
					<span class="font-mono text-code-label text-on-surface-variant">{size}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
