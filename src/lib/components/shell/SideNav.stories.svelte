<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StoryProviders from '$lib/storybook/StoryProviders.svelte';
	import SideNav from './SideNav.svelte';

	const { Story } = defineMeta({
		title: 'Shell/SideNav',
		component: SideNav,
		parameters: {
			layout: 'fullscreen',
			sveltekit_experimental: {
				state: {
					page: { url: new URL('http://storybook.local/dashboard') }
				}
			}
		}
	});
</script>

<Story name="Desktop">
	{#snippet template()}
		<StoryProviders>
			<div class="sb-shell-desktop relative min-h-screen bg-surface">
				<SideNav />
			</div>
		</StoryProviders>
	{/snippet}
</Story>

<style>
	.sb-shell-desktop :global(nav) {
		display: flex;
		position: relative;
	}
</style>
