<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	const sessionStore = useSession();

	const session = $derived(sessionStore.activeSession);
	const project = $derived(sessionStore.activeProject);
	const status = $derived(session?.status ?? 'idle');
	const isActive = $derived(status === 'active');
	const isPaused = $derived(status === 'paused');
	const isIdle = $derived(!session);

	const statusLabel = $derived(
		isActive ? m.timer_status_active() : isPaused ? m.timer_status_paused() : m.timer_status_idle()
	);
	const statusColor = $derived(
		isActive ? 'text-secondary' : isPaused ? 'text-tertiary' : 'text-on-surface-variant'
	);
	const statusDot = $derived(
		isActive ? 'bg-secondary blink' : isPaused ? 'bg-tertiary' : 'bg-outline-variant'
	);

	const cardBorder = $derived(
		isActive
			? 'border-outline-variant max-lg:border-primary max-lg:pulse-border lg:border-transparent'
			: isPaused
				? 'border-outline-variant max-lg:border-tertiary/60 lg:border-transparent'
				: 'border-outline-variant lg:border-transparent'
	);

	const clockLabel = $derived(isIdle ? '00:00:00' : sessionStore.elapsedLabel);
	const projectCode = $derived(project?.code ?? project?.name?.slice(0, 4).toUpperCase() ?? '—');
	const pending = $derived(sessionStore.busy);
</script>

<div
	class="flex flex-col items-center rounded-lg border bg-surface-container px-6 py-7 lg:rounded-none lg:bg-transparent lg:px-5 lg:py-10 {cardBorder}"
	role="region"
	aria-label={m.timer_session_aria()}
>
	<div
		class="font-mono text-4xl font-bold tracking-tight text-primary tabular-nums sm:text-5xl md:text-[3.5rem] md:leading-none"
		data-testid="timer-elapsed"
	>
		{clockLabel}
	</div>

	<div class="mt-3 flex items-center gap-2">
		<div class="h-1.5 w-1.5 rounded-full {statusDot}" aria-hidden="true"></div>
		<span class="font-mono text-code-label uppercase {statusColor}" data-testid="timer-status"
			>{statusLabel}</span
		>
		{#if !isIdle}
			<span class="text-on-surface-variant" aria-hidden="true">·</span>
			<span class="font-mono text-code-label text-primary" data-testid="timer-project">
				{m.timer_proj_prefix({ code: projectCode })}
			</span>
		{/if}
	</div>

	<div class="mt-6 flex w-full max-w-[280px] gap-3">
		{#if isIdle}
			<button
				type="button"
				class="press focus-ring flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-60"
				onclick={() => sessionStore.start()}
				disabled={pending}
			>
				<span
					class="material-symbols-outlined text-[22px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">play_arrow</span
				>
				{m.timer_start()}
			</button>
		{:else if isActive}
			<button
				type="button"
				class="press focus-ring flex flex-1 items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-highest py-2 text-headline-md text-on-surface hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
				onclick={() => sessionStore.pause()}
				disabled={pending}
			>
				<span class="material-symbols-outlined text-tertiary-fixed" aria-hidden="true">pause</span>
				{m.timer_pause()}
			</button>
			<button
				type="button"
				class="press focus-ring flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-60"
				onclick={() => sessionStore.stop()}
				disabled={pending}
			>
				<span
					class="material-symbols-outlined text-[20px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">stop</span
				>
				{m.timer_stop()}
			</button>
		{:else}
			<button
				type="button"
				class="press focus-ring flex flex-1 items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-highest py-2 text-headline-md text-on-surface hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
				onclick={() => sessionStore.resume()}
				disabled={pending}
			>
				<span class="material-symbols-outlined text-secondary" aria-hidden="true">play_arrow</span>
				{m.timer_resume()}
			</button>
			<button
				type="button"
				class="press focus-ring flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-60"
				onclick={() => sessionStore.stop()}
				disabled={pending}
			>
				<span
					class="material-symbols-outlined text-[20px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">stop</span
				>
				{m.timer_stop()}
			</button>
		{/if}
	</div>
</div>
