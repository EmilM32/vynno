<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Chip, { type ChipVariant } from './Chip.svelte';

	const { Story } = defineMeta({
		title: 'UI/Chip',
		component: Chip,
		args: {
			variant: 'code'
		}
	});

	const VARIANTS: ChipVariant[] = ['code', 'tag', 'ticket'];
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
				<Chip {variant}
					>{variant === 'tag' ? 'focus' : variant === 'ticket' ? 'VY-142' : 'AUTH'}</Chip
				>
			{/each}
		</div>
	{/snippet}
</Story>
