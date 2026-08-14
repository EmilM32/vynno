<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';

	const session = $derived(sessionStore.activeSession);
	const isActive = $derived(session?.status === 'active');
	const isPaused = $derived(session?.status === 'paused');
	const cardBorder = $derived(
		!session ? 'border-outline-variant' : isActive ? 'border-primary' : 'border-tertiary'
	);
	const toggleLabel = $derived(isActive ? m.timer_pause() : m.timer_resume());
	const pending = $derived(sessionStore.busy);

	function togglePause() {
		if (pending) return;
		if (isActive) sessionStore.pause();
		else if (isPaused) sessionStore.resume();
	}
</script>

<div
	class="relative flex flex-col rounded-lg border bg-surface-container p-4 md:col-span-8 {cardBorder}"
>
	{#if session}
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<h2 class="text-body-sm tracking-wider text-on-surface-variant uppercase">
					{m.dashboard_current_focus()}
				</h2>
				{#if session.ticketId}
					<div
						class="rounded-DEFAULT border border-outline-variant bg-surface-container-high px-2 py-0.5"
					>
						<span class="font-mono text-code-label text-primary">{session.ticketId}</span>
					</div>
				{/if}
				{#if isPaused}
					<span class="font-mono text-code-label text-tertiary">{m.timer_status_paused()}</span>
				{/if}
			</div>
			<a
				href={resolve('/timer')}
				class="focus-ring flex min-h-6 min-w-6 items-center justify-center rounded-DEFAULT border border-outline-variant bg-surface-container p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
				aria-label={m.dashboard_open_timer()}
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
			</a>
		</div>

		<p class="mb-2 text-headline-md text-on-surface">{session.note}</p>

		<div class="mt-auto flex flex-wrap items-center gap-3 border-t border-outline-variant/50 pt-4">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="press focus-ring inline-flex min-h-8 items-center gap-2 rounded px-1.5 py-1 font-mono text-code-data tabular-nums transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 {isActive
						? 'text-primary'
						: 'text-tertiary'}"
					aria-label={toggleLabel}
					title={toggleLabel}
					onclick={togglePause}
					disabled={pending}
				>
					<span class="material-symbols-outlined text-[18px]" aria-hidden="true">
						{isActive ? 'play_circle' : 'pause_circle'}
					</span>
					{sessionStore.elapsedLabel}
				</button>
				<button
					type="button"
					class="press focus-ring inline-flex min-h-8 items-center gap-1.5 rounded border border-primary/20 bg-primary px-3 py-1.5 font-mono text-code-data text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
					onclick={() => sessionStore.stop()}
					disabled={pending}
				>
					<span
						class="material-symbols-outlined text-[18px]"
						style="font-variation-settings: 'FILL' 1"
						aria-hidden="true">stop</span
					>
					{m.timer_stop()}
				</button>
			</div>
			{#if session.tags?.length}
				<div class="h-4 w-px bg-outline-variant" aria-hidden="true"></div>
				<div class="flex flex-wrap gap-2">
					{#each session.tags as tag (tag)}
						<span
							class="rounded-DEFAULT border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-code-label text-primary"
						>
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-body-sm tracking-wider text-on-surface-variant uppercase">
				{m.dashboard_current_focus()}
			</h2>
		</div>
		<p class="mb-4 text-body-md text-on-surface-variant">
			{m.dashboard_no_active()}
		</p>
		<div class="mt-auto border-t border-outline-variant/50 pt-4">
			<a
				href={resolve('/timer')}
				class="press inline-flex items-center gap-2 rounded border border-primary/20 bg-primary px-3 py-1.5 font-mono text-code-data text-on-primary hover:bg-primary-container"
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">play_arrow</span>
				{m.dashboard_start_session()}
			</a>
		</div>
	{/if}
</div>
