<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { MOBILE_TAB_ITEMS, isNavActive } from './nav';
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-50 border-t border-outline-variant bg-surface-container pb-[env(safe-area-inset-bottom,0px)] md:hidden"
	aria-label={m.nav_main_aria()}
>
	<div class="flex h-16 items-center justify-around px-1">
		{#each MOBILE_TAB_ITEMS as item (item.href)}
			{const active = $derived(isNavActive(page.url.pathname, item.href))}
			<a
				href={resolve(item.href)}
				class="press focus-ring flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1 {active
					? 'bg-secondary-container/20 text-primary'
					: 'text-on-surface-variant hover:text-primary'}"
				aria-current={active ? 'page' : undefined}
			>
				<Icon name={item.icon} size="lg" fill={active} class="mb-0.5" />
				<span class="max-w-full truncate text-[11px] leading-tight">{item.label()}</span>
			</a>
		{/each}
	</div>
</nav>
