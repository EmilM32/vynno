<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { NAV_ITEMS, isNavActive } from './nav';
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container px-1 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
	aria-label={m.nav_main_aria()}
>
	{#each NAV_ITEMS as item (item.href)}
		{const active = $derived(isNavActive(page.url.pathname, item.href))}
		<a
			href={resolve(item.href)}
			class="press focus-ring flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1 {active
				? 'bg-secondary-container/20 text-primary'
				: 'text-on-surface-variant hover:text-primary'}"
			aria-current={active ? 'page' : undefined}
		>
			<span
				class="material-symbols-outlined mb-0.5 text-[20px]"
				style={active ? "font-variation-settings: 'FILL' 1" : undefined}
				aria-hidden="true">{item.icon}</span
			>
			<span class="max-w-full truncate text-[10px] leading-tight">{item.label()}</span>
		</a>
	{/each}
</nav>
