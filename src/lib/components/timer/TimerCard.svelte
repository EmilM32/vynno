<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';

	const session = $derived(sessionStore.activeSession);
	const project = $derived(sessionStore.activeProject);
	const status = $derived(session?.status ?? 'idle');
	const isActive = $derived(status === 'active');
	const isPaused = $derived(status === 'paused');
	const isIdle = $derived(!session);

	const statusLabel = $derived(isActive ? 'ACTIVE' : isPaused ? 'PAUSED' : 'IDLE');
	const statusColor = $derived(
		isActive ? 'text-secondary-fixed' : isPaused ? 'text-tertiary' : 'text-on-surface-variant'
	);
	const statusDot = $derived(
		isActive ? 'bg-secondary-fixed blink' : isPaused ? 'bg-tertiary' : 'bg-outline-variant'
	);

	const cardBorder = $derived(
		isActive
			? 'border-primary pulse-border'
			: isPaused
				? 'border-tertiary/60'
				: 'border-outline-variant'
	);

	const clockLabel = $derived(isIdle ? '00:00:00' : sessionStore.elapsedLabel);
	const projectCode = $derived(project?.code ?? project?.name?.slice(0, 4).toUpperCase() ?? '—');
</script>

<div
	class="relative flex flex-col items-center justify-center rounded-lg border bg-surface-container p-8 {cardBorder}"
	role="region"
	aria-label="Session timer"
	aria-live="polite"
>
	<div class="absolute top-4 left-4 flex items-center gap-2">
		<div class="h-2 w-2 rounded-full {statusDot}" aria-hidden="true"></div>
		<span class="font-mono text-code-label uppercase {statusColor}">{statusLabel}</span>
	</div>

	{#if !isIdle}
		<div class="absolute top-4 right-4">
			<span
				class="rounded border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-code-label text-primary"
			>
				PROJ: {projectCode}
			</span>
		</div>
	{/if}

	<div
		class="mt-6 mb-8 font-mono text-4xl font-bold tracking-tight tabular-nums text-primary sm:text-5xl md:text-[3.5rem] md:leading-none"
	>
		{clockLabel}
	</div>

	<div class="flex w-full max-w-[300px] gap-4">
		{#if isIdle}
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary transition-colors hover:bg-primary-fixed-dim"
				onclick={() => sessionStore.start()}
			>
				<span
					class="material-symbols-outlined text-[22px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">play_arrow</span
				>
				Start
			</button>
		{:else if isActive}
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-highest py-2 text-headline-md text-on-surface transition-colors hover:bg-surface-variant"
				onclick={() => sessionStore.pause()}
			>
				<span class="material-symbols-outlined text-tertiary-fixed" aria-hidden="true">pause</span>
				Pause
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary transition-colors hover:bg-primary-fixed-dim"
				onclick={() => sessionStore.stop()}
			>
				<span
					class="material-symbols-outlined text-[20px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">stop</span
				>
				Stop
			</button>
		{:else}
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-highest py-2 text-headline-md text-on-surface transition-colors hover:bg-surface-variant"
				onclick={() => sessionStore.resume()}
			>
				<span class="material-symbols-outlined text-secondary" aria-hidden="true">play_arrow</span>
				Resume
			</button>
			<button
				type="button"
				class="flex flex-1 items-center justify-center gap-2 rounded border border-transparent bg-primary py-2 text-headline-md text-on-primary transition-colors hover:bg-primary-fixed-dim"
				onclick={() => sessionStore.stop()}
			>
				<span
					class="material-symbols-outlined text-[20px]"
					style="font-variation-settings: 'FILL' 1"
					aria-hidden="true">stop</span
				>
				Stop
			</button>
		{/if}
	</div>
</div>
