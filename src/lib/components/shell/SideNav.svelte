<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import BrandMark from './BrandMark.svelte';
	import ProfileAvatar from './ProfileAvatar.svelte';
	import { NAV_ITEMS, isNavActive } from './nav';

	const prefsStore = usePrefs();
	let commandsBtn: HTMLElement | undefined = $state();

	/** The palette restores focus here on close, so it needs the rendered node. */
	function bindCommandsBtn(node: HTMLElement) {
		commandsBtn = node;
		return () => {
			if (commandsBtn === node) commandsBtn = undefined;
		};
	}
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
		<Button variant="primary" href={resolve('/timer')} class="w-full">
			<Icon name="play_arrow" />
			{m.nav_start_new_session()}
		</Button>
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
					<Icon
						name={item.icon}
						size="lg"
						fill={active}
						class="transition-colors {active ? '' : 'group-hover:text-primary'}"
					/>
					<span class="text-body-md font-medium">{item.label()}</span>
				</a>
			</li>
		{/each}
	</ul>

	<div class="mt-auto">
		<div class="px-3 pb-2">
			<Button
				{@attach bindCommandsBtn}
				variant="quiet"
				justify="start"
				class="w-full text-on-surface-variant hover:text-primary"
				title="⌘K"
				onclick={() => commandPalette.show(commandsBtn)}
			>
				<kbd
					class="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px]"
					aria-hidden="true">⌘K</kbd
				>
				<span class="font-mono text-code-label">{m.shell_commands()}</span>
			</Button>
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
