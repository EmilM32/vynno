<script lang="ts">
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import StatusDot, { type StatusDotTone } from '$lib/components/ui/StatusDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { normalizeNote, normalizeTicketId } from '$lib/text/normalize';
	import {
		datetimeLocalToIso,
		formatClock,
		formatCompact,
		isoToDatetimeLocal
	} from '$lib/time/duration';

	/** Focus-block presets; any other target set through the API still shows progress. */
	const TARGET_PRESETS_MS = [25, 50, 90].map((min) => min * 60_000);

	const sessionStore = useSession();

	const session = $derived(sessionStore.activeSession);
	const project = $derived(sessionStore.activeProject);
	const status = $derived(session?.status ?? 'idle');
	const isActive = $derived(status === 'active');
	const isIdle = $derived(!session);

	const statusLabel = $derived(isActive ? m.timer_status_active() : m.timer_status_idle());
	const statusColor = $derived(isActive ? 'text-secondary' : 'text-on-surface-variant');
	const statusDot: StatusDotTone = $derived(isActive ? 'live' : 'idle');

	const clockLabel = $derived(isIdle ? '00:00:00' : sessionStore.elapsedLabel);
	const projectName = $derived(project?.name ?? m.common_unknown());
	const pending = $derived(sessionStore.busy);

	function onStart() {
		const note = normalizeNote(sessionStore.draftNote);
		const ticket = normalizeTicketId(sessionStore.draftTicket);
		if (!note.ok || !ticket.ok) return;
		sessionStore.draftNote = note.value;
		sessionStore.draftTicket = ticket.value;
		void sessionStore.start();
	}

	type TargetChoice = 'off' | `${number}`;
	const targetOptions: { id: TargetChoice; label: string }[] = [
		{ id: 'off', label: m.timer_target_off() },
		...TARGET_PRESETS_MS.map((ms) => ({ id: `${ms}` as const, label: formatCompact(ms) }))
	];
	const targetMs = $derived(
		session ? (session.targetDurationMs ?? null) : sessionStore.draftTargetMs
	);
	const targetChoice = $derived<TargetChoice>(targetMs == null ? 'off' : `${targetMs}`);
	const liveTarget = $derived(session && targetMs ? targetMs : null);
	const targetReached = $derived(liveTarget != null && sessionStore.elapsedMs >= liveTarget);

	function onTargetChange(choice: TargetChoice) {
		const next = choice === 'off' ? null : Number(choice);
		if (!session) {
			sessionStore.draftTargetMs = next;
			return;
		}
		if ((session.targetDurationMs ?? null) === next || pending) return;
		void sessionStore.updateSession(session.id, { targetDurationMs: next });
	}

	function onStartedChange(e: Event) {
		if (!session || pending) return;
		const iso = datetimeLocalToIso((e.currentTarget as HTMLInputElement).value);
		if (!iso || iso === session.startedAt) return;
		void sessionStore.updateSession(session.id, { startedAt: iso });
	}
</script>

<div
	class="flex flex-col items-center px-6 py-7 lg:px-5 lg:py-10"
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
		<StatusDot tone={statusDot} />
		<span class="font-mono text-code-label uppercase {statusColor}" data-testid="timer-status"
			>{statusLabel}</span
		>
		{#if !isIdle}
			<span class="text-on-surface-variant" aria-hidden="true">·</span>
			<span
				class="line-clamp-2 min-w-0 font-mono text-code-label wrap-anywhere text-primary"
				title={projectName}
				data-testid="timer-project"
			>
				{m.timer_project_line({ name: projectName })}
			</span>
		{/if}
	</div>
	{#if session}
		<label class="mt-3 flex items-center gap-2 font-mono text-code-label text-on-surface-variant">
			<span>{m.timer_started_at()}</span>
			<Input
				type="datetime-local"
				tone="code"
				size="sm"
				value={isoToDatetimeLocal(session.startedAt)}
				onchange={onStartedChange}
				disabled={pending}
				data-testid="timer-started-at"
			/>
		</label>
	{/if}

	{#if liveTarget != null}
		<div class="mt-4 flex w-full max-w-70 flex-col gap-1.5" data-testid="timer-target">
			<ProgressBar
				value={(sessionStore.elapsedMs / liveTarget) * 100}
				size="sm"
				fill={targetReached ? 'secondary' : 'primary'}
				label={m.timer_target_progress_aria()}
			/>
			<p
				class="text-center font-mono text-code-label {targetReached
					? 'text-secondary'
					: 'text-on-surface-variant'}"
				data-testid="timer-target-status"
			>
				{targetReached
					? m.timer_target_reached({ clock: formatClock(sessionStore.elapsedMs - liveTarget) })
					: m.timer_target_left({ clock: formatClock(liveTarget - sessionStore.elapsedMs) })}
			</p>
		</div>
	{/if}

	<div class="mt-4 flex items-center gap-2">
		<span class="font-mono text-code-label text-on-surface-variant uppercase" aria-hidden="true"
			>{m.timer_target_label()}</span
		>
		<PeriodToggle
			value={targetChoice}
			options={targetOptions}
			ariaLabel={m.timer_target_aria()}
			onchange={onTargetChange}
		/>
	</div>

	<div class="mt-6 flex w-full max-w-70 gap-3">
		{#if isIdle}
			<Button variant="primary" size="lg" class="flex-1" onclick={onStart} disabled={pending}>
				<Icon name="play_arrow" size="xl" fill />
				{m.timer_start()}
			</Button>
		{:else}
			<Button
				variant="secondary"
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
