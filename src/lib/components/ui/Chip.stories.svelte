<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Chip, { type ChipVariant } from './Chip.svelte';

	const { Story } = defineMeta({
		title: 'UI/Chip',
		component: Chip,
		parameters: {
			docs: {
				description: {
					component:
						'`code` (default) for a project code or the app version; `ticket` for a ticket id (pass `title` with the full text). Rules: [display.md](https://github.com/EmilM32/vynno/blob/main/docs/design-system/display.md#chip-and-activitychip).'
				}
			}
		},
		args: {
			variant: 'code'
		}
	});

	const VARIANTS: ChipVariant[] = ['code', 'ticket'];
</script>

<Story name="Default">
	{#snippet template(args)}
		<Chip variant={args.variant}>AUTH</Chip>
	{/snippet}
</Story>

<Story name="Variants">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-3">
			{#each VARIANTS as variant (variant)}
				<Chip {variant}>{variant === 'ticket' ? 'VY-142' : 'AUTH'}</Chip>
			{/each}
		</div>
	{/snippet}
</Story>
