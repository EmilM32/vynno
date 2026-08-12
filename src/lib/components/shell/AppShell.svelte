<script lang="ts">
	import type { Snippet } from 'svelte';
	import BottomNav from './BottomNav.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';

	let { children, pageTitle = '' }: { children: Snippet; pageTitle?: string } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-surface text-on-surface">
	<SideNav />
	<div class="flex min-h-dvh flex-1 flex-col md:ml-sidebar">
		<TopBar title={pageTitle} />
		<main class="flex-1 overflow-y-auto px-margin-mobile py-6 pb-24 md:px-margin-desktop md:pb-6">
			<div class="mx-auto w-full max-w-container-max">
				{@render children()}
			</div>
		</main>
	</div>
	<BottomNav />
</div>
