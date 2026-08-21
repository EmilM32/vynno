<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';

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

	const { Story } = defineMeta({
		title: 'Foundations/Colors'
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
