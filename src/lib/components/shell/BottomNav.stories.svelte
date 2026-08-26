<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomNav from './BottomNav.svelte';

	const { Story } = defineMeta({
		title: 'Shell/BottomNav',
		component: BottomNav,
		parameters: {
			layout: 'fullscreen',
			sveltekit_experimental: {
				state: {
					page: { url: new URL('http://storybook.local/timer') }
				}
			}
		}
	});
</script>

<Story name="Mobile">
	{#snippet template()}
		<div class="sb-shell-mobile relative mx-auto min-h-24 max-w-[375px] bg-surface">
			<BottomNav />
		</div>
	{/snippet}
</Story>

<style>
	.sb-shell-mobile :global(nav) {
		display: block;
		position: relative;
	}
</style>
