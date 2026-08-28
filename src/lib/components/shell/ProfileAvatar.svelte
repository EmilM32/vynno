<script lang="ts">
	import { rewriteAvatarUrl } from '$lib/api/mappers/profile';

	let {
		name,
		src,
		size = 'md'
	}: {
		name: string;
		src?: string;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const imageSrc = $derived(src ? rewriteAvatarUrl(src) : undefined);

	const initials = $derived(
		name
			.split(/\s+/)
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);

	const box = $derived(
		size === 'lg'
			? 'h-14 w-14 text-lg'
			: size === 'sm'
				? 'h-9 w-9 text-body-sm'
				: 'h-10 w-10 text-body-sm'
	);
</script>

{#if imageSrc}
	<img
		src={imageSrc}
		alt=""
		class="{box} shrink-0 rounded-DEFAULT border border-outline-variant object-cover"
	/>
{:else}
	<div
		class="{box} flex shrink-0 items-center justify-center rounded-DEFAULT border border-outline-variant bg-surface-container-high font-mono text-primary"
		aria-hidden="true"
	>
		{initials}
	</div>
{/if}
