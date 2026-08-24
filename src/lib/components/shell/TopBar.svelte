<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import BrandMark from './BrandMark.svelte';
	import { isNavActive } from './nav';

	const sessionStore = useSession();

	let commandsBtn: HTMLElement | undefined = $state();

	/** The palette restores focus here on close, so it needs the rendered node. */
	function bindCommandsBtn(node: HTMLElement) {
		commandsBtn = node;
		return () => {
			if (commandsBtn === node) commandsBtn = undefined;
		};
	}

	const live = $derived(
		sessionStore.activeSession?.status === 'active' ||
			sessionStore.activeSession?.status === 'paused'
	);
	const isActive = $derived(sessionStore.activeSession?.status === 'active');
	const settingsActive = $derived(isNavActive(page.url.pathname, '/settings'));
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface pt-[env(safe-area-inset-top,0px)] md:hidden"
>
	<div class="flex h-14 w-full items-center justify-between px-4">
		<div class="flex items-center gap-2">
			<BrandMark class="size-6 shrink-0 text-primary" />
			<span class="text-headline-md font-bold text-primary">{m.app_name()}</span>
		</div>
		<div class="flex items-center gap-1">
			<IconButton
				{@attach bindCommandsBtn}
				icon="terminal"
				label={m.shell_open_command_palette()}
				title="⌘K"
				onclick={() => commandPalette.show(commandsBtn)}
			/>
			<IconButton
				href={resolve('/settings')}
				icon="settings"
				label={m.nav_settings()}
				fill={settingsActive}
				selected={settingsActive}
				aria-current={settingsActive ? 'page' : undefined}
				data-testid="shell-settings"
			/>
			<Icon
				name="fiber_manual_record"
				fill={live}
				hidden={false}
				class="px-1 {live
					? isActive
						? 'text-secondary'
						: 'text-tertiary'
					: 'text-on-surface-variant'}"
				aria-label={live
					? isActive
						? m.shell_session_recording()
						: m.shell_session_paused()
					: m.shell_no_active_session()}
				role="status"
			/>
		</div>
	</div>
</header>
