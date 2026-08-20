<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import BrandMark from './BrandMark.svelte';
	import { isNavActive } from './nav';

	const sessionStore = useSession();

	let commandsBtn: HTMLButtonElement | undefined = $state();

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
			<button
				bind:this={commandsBtn}
				type="button"
				class="focus-ring flex min-h-10 min-w-10 items-center justify-center rounded p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary"
				aria-label={m.shell_open_command_palette()}
				title="⌘K"
				onclick={() => commandPalette.show(commandsBtn)}
			>
				<span class="material-symbols-outlined text-[22px]" aria-hidden="true">terminal</span>
			</button>
			<a
				href={resolve('/settings')}
				class="focus-ring flex min-h-10 min-w-10 items-center justify-center rounded p-2 hover:bg-surface-container {settingsActive
					? 'text-primary'
					: 'text-on-surface-variant hover:text-primary'}"
				aria-label={m.nav_settings()}
				aria-current={settingsActive ? 'page' : undefined}
				data-testid="shell-settings"
			>
				<span
					class="material-symbols-outlined text-[22px]"
					style={settingsActive ? "font-variation-settings: 'FILL' 1" : undefined}
					aria-hidden="true">settings</span
				>
			</a>
			<span
				class="material-symbols-outlined px-1 text-[18px] {live
					? isActive
						? 'text-secondary'
						: 'text-tertiary'
					: 'text-on-surface-variant'}"
				style={live ? "font-variation-settings: 'FILL' 1" : undefined}
				aria-label={live
					? isActive
						? m.shell_session_recording()
						: m.shell_session_paused()
					: m.shell_no_active_session()}
				role="status">fiber_manual_record</span
			>
		</div>
	</div>
</header>
