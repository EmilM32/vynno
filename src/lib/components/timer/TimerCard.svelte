<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { datetimeLocalToIso, isoToDatetimeLocal } from '$lib/time/duration';

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

	function onStartedChange(e: Event) {
		if (!session || pending) return;
		const iso = datetimeLocalToIso((e.currentTarget as HTMLInputElement).value);
		if (!iso || iso === session.startedAt) return;
		void sessionStore.updateSession(session.id, { startedAt: iso });
	}
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
	{#if session}
		<label class="mt-3 flex items-center gap-2 font-mono text-code-label text-on-surface-variant">
			<span>{m.timer_started_at()}</span>
			<input
				type="datetime-local"
				class="rounded border border-outline-variant bg-surface-container-low px-2 py-1 text-on-surface disabled:opacity-60"
				value={isoToDatetimeLocal(session.startedAt)}
				onchange={onStartedChange}
				disabled={pending}
				data-testid="timer-started-at"
			/>
		</label>
	{/if}

	<div class="mt-6 flex w-full max-w-[280px] gap-3">
		{#if isIdle}
			<Button
				variant="primary"
				size="lg"
				class="flex-1"
				onclick={() => sessionStore.start()}
				disabled={pending}
			>
				<Icon name="play_arrow" size="xl" fill />
				{m.timer_start()}
			</Button>
		{:else if isActive}
			<Button
				variant="neutral"
				size="lg"
				class="flex-1"
				onclick={() => sessionStore.pause()}
				disabled={pending}
			>
				<Icon name="pause" size="2xl" class="text-tertiary-fixed" />
				{m.timer_pause()}
			</Button>
			<Button
				variant="primary"
				size="lg"
				class="flex-1"
				onclick={() => sessionStore.stop()}
				disabled={pending}
			>
				<Icon name="stop" size="lg" fill />
				{m.timer_stop()}
			</Button>
		{:else}
			<Button
				variant="neutral"
				size="lg"
				class="flex-1"
				onclick={() => sessionStore.resume()}
				disabled={pending}
			>
				<Icon name="play_arrow" size="2xl" class="text-secondary" />
				{m.timer_resume()}
			</Button>
			<Button
				variant="primary"
				size="lg"
				class="flex-1"
				onclick={() => sessionStore.stop()}
				disabled={pending}
			>
				<Icon name="stop" size="lg" fill />
				{m.timer_stop()}
			</Button>
		{/if}
	</div>
</div>
