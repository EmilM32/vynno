<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
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

	const live = $derived(sessionStore.activeSession?.status === 'active');
	const settingsActive = $derived(isNavActive(page.url.pathname, '/settings'));
	const onTimer = $derived(isNavActive(page.url.pathname, '/timer'));
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
				icon="search"
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
			{#if !onTimer && live}
				<!-- The one live cue in the bar: elapsed time, a tap away from Timer (EMI-269). -->
				<a
					href={resolve('/timer')}
					class="focus-ring ml-1 inline-flex h-10 items-center gap-2 rounded border border-primary px-2.5 font-mono text-code-data text-on-surface tabular-nums"
					aria-label={m.shell_session_chip_aria({
						status: m.shell_session_recording(),
						elapsed: sessionStore.elapsedLabel,
						detail: sessionStore.activeProject?.name ?? m.common_unknown()
					})}
					data-testid="shell-live-chip"
				>
					<StatusDot tone="live" />
					{sessionStore.elapsedLabel}
				</a>
			{:else if !onTimer}
				<span
					role="status"
					class="inline-flex size-10 items-center justify-center"
					aria-label={m.shell_no_active_session()}
				>
					<StatusDot tone="idle" />
				</span>
			{/if}
		</div>
	</div>
</header>
