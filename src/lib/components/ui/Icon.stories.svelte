<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Icon, { type IconSize } from './Icon.svelte';

	const { Story } = defineMeta({
		title: 'UI/Icon',
		component: Icon,
		args: {
			name: 'play_arrow',
			size: 'md',
			fill: false
		}
	});

	const SIZES: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
	const PX: Record<IconSize, string> = {
		xs: '14px',
		sm: '16px',
		md: '18px',
		lg: '20px',
		xl: '22px',
		'2xl': '24px'
	};

	const SAMPLE = [
		'play_arrow',
		'pause',
		'stop',
		'search',
		'settings',
		'terminal',
		'more_horiz',
		'arrow_back',
		'arrow_forward',
		'open_in_new',
		'visibility',
		'fiber_manual_record'
	];
</script>

<Story name="Default" />

<!-- The whole scale. Call sites pass `size`, never an arbitrary `text-[Npx]`. -->
<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-wrap items-end gap-6">
			{#each SIZES as size (size)}
				<div class="flex flex-col items-center gap-1">
					<Icon {...args} {size} />
					<span class="font-mono text-code-label text-on-surface-variant">{size}</span>
					<span class="font-mono text-[10px] text-on-surface-variant">{PX[size]}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- `fill` drives the Material Symbols FILL axis — used for active nav and transport. -->
<Story name="Fill">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-6">
			{#each ['play_arrow', 'stop', 'settings', 'fiber_manual_record'] as name (name)}
				<div class="flex items-center gap-2">
					<Icon {name} size="2xl" />
					<Icon {name} size="2xl" fill class="text-primary" />
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Gallery">
	{#snippet template()}
		<div class="flex flex-wrap gap-4">
			{#each SAMPLE as name (name)}
				<div
					class="flex min-w-24 flex-col items-center gap-1 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3"
				>
					<Icon {name} size="2xl" class="text-on-surface" />
					<span class="font-mono text-[10px] text-on-surface-variant">{name}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
