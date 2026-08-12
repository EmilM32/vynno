<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import BottomNav from './BottomNav.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';

	let { children, pageTitle = '' }: { children: Snippet; pageTitle?: string } = $props();
</script>

<a
	href="#main-content"
	class="focus-ring bg-primary text-on-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:rounded focus:px-3 focus:py-2"
>
	{m.shell_skip_to_content()}
</a>

<div class="flex min-h-dvh flex-col bg-surface text-on-surface">
	<SideNav />
	<div class="flex min-h-dvh flex-1 flex-col md:ml-sidebar">
		<TopBar title={pageTitle} />
		<main
			id="main-content"
			class="flex-1 overflow-y-auto px-margin-mobile py-6 pb-24 md:px-margin-desktop md:pb-6"
			tabindex="-1"
		>
			<div class="mx-auto w-full max-w-container-max">
				{@render children()}
			</div>
		</main>
	</div>
	<BottomNav />
	<CommandPalette />
</div>
