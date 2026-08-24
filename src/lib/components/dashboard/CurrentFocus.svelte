<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	const sessionStore = useSession();

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
			<IconButton
				href={resolve('/timer')}
				icon="open_in_new"
				label={m.dashboard_open_timer()}
				variant="bordered"
				size="sm"
			/>
		</div>

		<p class="mb-2 text-headline-md text-on-surface">{session.note}</p>

		<div class="mt-auto flex flex-wrap items-center gap-3 border-t border-outline-variant/50 pt-4">
			<div class="flex items-center gap-2">
				<Button
					variant="quiet"
					class={isActive ? 'text-primary' : 'text-tertiary'}
					aria-label={toggleLabel}
					title={toggleLabel}
					onclick={togglePause}
					disabled={pending}
				>
					<Icon name={isActive ? 'pause_circle' : 'play_circle'} />
					<span class="font-mono text-code-data tabular-nums">{sessionStore.elapsedLabel}</span>
				</Button>
				<Button variant="primary" size="sm" onclick={() => sessionStore.stop()} disabled={pending}>
					<Icon name="stop" fill />
					{m.timer_stop()}
				</Button>
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
			<Button variant="primary" size="sm" href={resolve('/timer')}>
				<Icon name="play_arrow" />
				{m.dashboard_start_session()}
			</Button>
		</div>
	{/if}
</div>
