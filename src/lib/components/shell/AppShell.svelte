<script lang="ts">
	import type { Snippet } from 'svelte';
	import { bindAnnouncers } from '$lib/a11y/announce';
	import { m } from '$lib/paraglide/messages.js';
	import BottomNav from './BottomNav.svelte';
	import CommandPalette from './CommandPalette.svelte';
	import SideNav from './SideNav.svelte';
	import TopBar from './TopBar.svelte';

	let { children, pageTitle = '' }: { children: Snippet; pageTitle?: string } = $props();

	let politeEl: HTMLElement | undefined = $state();
	let assertiveEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!politeEl || !assertiveEl) return;
		bindAnnouncers(politeEl, assertiveEl);
	});
</script>

<a
	href="#main-content"
	class="focus-ring sr-only bg-primary text-on-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:rounded focus:px-3 focus:py-2 focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-[200] focus-visible:rounded focus-visible:px-3 focus-visible:py-2"
>
	{m.shell_skip_to_content()}
</a>

<div bind:this={politeEl} class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
<div bind:this={assertiveEl} class="sr-only" aria-live="assertive" aria-atomic="true"></div>

<div class="flex h-dvh flex-col bg-surface text-on-surface">
	<SideNav />
	<div class="flex min-h-0 flex-1 flex-col md:ml-sidebar">
		<TopBar title={pageTitle} />
		<main
			id="main-content"
			class="min-h-0 flex-1 scroll-pt-16 overflow-y-auto px-margin-mobile py-6 pb-24 md:scroll-pt-0 md:px-margin-desktop md:pt-0 md:pb-6"
			tabindex="-1"
		>
			<div class="w-full">
				{@render children()}
			</div>
		</main>
	</div>
	<BottomNav />
	<CommandPalette />
</div>
