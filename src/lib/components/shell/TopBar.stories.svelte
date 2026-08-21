<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StoryProviders from '$lib/storybook/StoryProviders.svelte';
	import TopBar from './TopBar.svelte';

	const { Story } = defineMeta({
		title: 'Shell/TopBar',
		component: TopBar,
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Mobile">
	{#snippet template()}
		<StoryProviders>
			<div class="sb-shell-mobile relative min-h-20 bg-surface">
				<TopBar />
			</div>
		</StoryProviders>
	{/snippet}
</Story>

<style>
	.sb-shell-mobile :global(header) {
		display: block;
		position: relative;
	}
</style>
