<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import BrandMark from './BrandMark.svelte';

	let { title = '' }: { title?: string } = $props();
	let searchBtn: HTMLButtonElement | undefined = $state();

	const live = $derived(
		sessionStore.activeSession?.status === 'active' ||
			sessionStore.activeSession?.status === 'paused'
	);
	const isActive = $derived(sessionStore.activeSession?.status === 'active');
</script>

<header
	class="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface px-4 md:hidden"
>
	<div class="flex items-center gap-2">
		<BrandMark class="size-6 shrink-0 text-primary" />
		<span class="text-headline-md font-bold text-primary">{m.app_name()}</span>
	</div>
	<div class="flex items-center gap-3">
		{#if title}
			<span class="text-body-sm text-on-surface-variant">{title}</span>
		{/if}
		<button
			bind:this={searchBtn}
			type="button"
			class="focus-ring flex min-h-10 min-w-10 items-center justify-center rounded p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary"
			aria-label={m.shell_open_command_palette()}
			title="⌘K"
			onclick={() => commandPalette.show(searchBtn)}
		>
			<span class="material-symbols-outlined text-[22px]" aria-hidden="true">search</span>
		</button>
		<span
			class="material-symbols-outlined text-[18px] {live
				? isActive
					? 'blink text-secondary'
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
</header>
