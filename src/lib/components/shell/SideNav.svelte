<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { prefsStore } from '$lib/stores/prefs.svelte';
	import BrandMark from './BrandMark.svelte';
	import { APP_VERSION, NAV_ITEMS, isNavActive } from './nav';

	const initials = $derived(
		prefsStore.displayName
			.split(/\s+/)
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<nav
	class="fixed top-0 left-0 z-50 hidden h-screen w-sidebar flex-col border-r border-outline-variant bg-surface py-4 md:flex"
	aria-label={m.nav_main_aria()}
>
	<div class="mb-8 flex items-center gap-3 px-6">
		<BrandMark class="size-8 shrink-0 text-primary" />
		<div>
			<p class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</p>
			<p class="font-mono text-[10px] text-on-surface-variant uppercase">
				{APP_VERSION}
			</p>
		</div>
	</div>

	<div class="mb-4 px-4">
		<a
			href={resolve('/timer')}
			class="press focus-ring flex w-full items-center justify-center gap-2 rounded-DEFAULT border border-primary/20 bg-primary px-4 py-2 font-mono text-code-data font-medium text-background hover:bg-primary-container"
		>
			<span class="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>
			{m.nav_start_new_session()}
		</a>
	</div>

	<ul class="flex flex-1 flex-col gap-1 px-3">
		{#each NAV_ITEMS as item (item.href)}
			{const active = $derived(isNavActive(page.url.pathname, item.href))}
			<li>
				<a
					href={resolve(item.href)}
					class="focus-ring group flex items-center gap-3 rounded-DEFAULT border-l-2 px-3 py-2 transition-colors duration-150 {active
						? 'border-primary bg-surface-container-high text-primary'
						: 'border-transparent text-on-surface-variant hover:bg-surface-variant hover:text-primary'}"
					aria-current={active ? 'page' : undefined}
				>
					<span
						class="material-symbols-outlined text-[20px] transition-colors {active
							? ''
							: 'group-hover:text-primary'}"
						style={active ? "font-variation-settings: 'FILL' 1" : undefined}
						aria-hidden="true">{item.icon}</span
					>
					<span class="text-body-md font-medium">{item.label()}</span>
				</a>
			</li>
		{/each}
	</ul>

	<div class="mt-auto border-t border-outline-variant px-3 pt-3">
		<a
			href={resolve('/settings')}
			class="focus-ring flex items-center gap-3 rounded-DEFAULT px-3 py-2 transition-colors hover:bg-surface-variant"
		>
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT border border-outline-variant bg-surface-container-high font-mono text-body-sm text-primary"
				aria-hidden="true"
			>
				{initials}
			</div>
			<div class="min-w-0">
				<p class="truncate text-body-sm font-medium text-on-surface">{prefsStore.displayName}</p>
				<p class="truncate font-mono text-[10px] text-on-surface-variant">{prefsStore.handle}</p>
			</div>
		</a>
	</div>
</nav>
