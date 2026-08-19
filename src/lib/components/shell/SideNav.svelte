<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import BrandMark from './BrandMark.svelte';
	import ProfileAvatar from './ProfileAvatar.svelte';
	import { NAV_ITEMS, isNavActive } from './nav';

	const prefsStore = usePrefs();
	let searchBtn: HTMLButtonElement | undefined = $state();
</script>

<nav
	class="fixed top-0 left-0 z-50 hidden h-screen w-sidebar flex-col border-r border-outline-variant bg-surface py-4 md:flex"
	aria-label={m.nav_main_aria()}
>
	<div class="mb-8 flex items-center gap-3 px-6">
		<BrandMark class="size-8 shrink-0 text-primary" />
		<div>
			<p class="text-headline-md leading-tight font-bold text-primary">{m.app_name()}</p>
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

	<div class="mt-auto">
		<div class="px-3 pb-2">
			<button
				bind:this={searchBtn}
				type="button"
				class="focus-ring flex w-full items-center gap-3 rounded-DEFAULT px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
				aria-label={m.shell_open_command_palette()}
				title="⌘K"
				onclick={() => commandPalette.show(searchBtn)}
			>
				<span class="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
				<span class="flex-1 text-left text-body-md font-medium">{m.shell_search()}</span>
				<kbd
					class="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px]"
					aria-hidden="true">⌘K</kbd
				>
			</button>
		</div>
		<div class="border-t border-outline-variant px-3 pt-3">
			<a
				href={resolve('/settings')}
				class="focus-ring flex items-center gap-3 rounded-DEFAULT px-3 py-2 transition-colors hover:bg-surface-variant"
			>
				<ProfileAvatar name={prefsStore.displayName} src={prefsStore.avatarUrl} size="sm" />
				<div class="min-w-0">
					<p class="truncate text-body-sm font-medium text-on-surface">{prefsStore.displayName}</p>
					<p class="truncate font-mono text-[10px] text-on-surface-variant">{prefsStore.handle}</p>
				</div>
			</a>
		</div>
	</div>
</nav>
