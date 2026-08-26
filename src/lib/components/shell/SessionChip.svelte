<script lang="ts">
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatusDot, { type StatusDotTone } from '$lib/components/ui/StatusDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	const sessionStore = useSession();

	const session = $derived(sessionStore.activeSession);
	const project = $derived(sessionStore.activeProject);
	const isActive = $derived(session?.status === 'active');

	const statusLabel = $derived(isActive ? m.timer_status_active() : m.timer_status_paused());
	const statusSpoken = $derived(isActive ? m.shell_session_recording() : m.shell_session_paused());
	const statusColor = $derived(isActive ? 'text-secondary' : 'text-tertiary');
	const statusDot: StatusDotTone = $derived(isActive ? 'live' : 'paused');
	const cardBorder = $derived(isActive ? 'border-primary' : 'border-tertiary');

	const projectCode = $derived(project?.code ?? project?.name?.slice(0, 4).toUpperCase() ?? '—');
	const detail = $derived.by(() => {
		const note = session?.note?.trim();
		return note ? `${projectCode} · ${note}` : projectCode;
	});
	const ariaLabel = $derived(
		m.shell_session_chip_aria({
			status: statusSpoken,
			elapsed: sessionStore.elapsedLabel,
			detail
		})
	);
</script>

{#if session}
	<a
		href={resolve('/timer')}
		class="focus-ring flex w-full flex-col gap-1 rounded border px-3 py-2.5 transition-colors hover:bg-surface-variant {cardBorder}"
		aria-label={ariaLabel}
		data-testid="shell-session-chip"
	>
		<div class="flex items-center gap-2">
			<StatusDot tone={statusDot} />
			<span
				class="font-mono text-code-label uppercase {statusColor}"
				data-testid="shell-session-status">{statusLabel}</span
			>
			<span
				class="ml-auto font-mono text-code-data text-on-surface tabular-nums"
				data-testid="shell-session-elapsed">{sessionStore.elapsedLabel}</span
			>
		</div>
		<div class="flex min-w-0 items-baseline gap-1.5">
			<span class="shrink-0 font-mono text-code-label text-primary">{projectCode}</span>
			{#if session.note.trim()}
				<span class="text-on-surface-variant" aria-hidden="true">·</span>
				<span class="truncate text-body-sm text-on-surface">{session.note}</span>
			{/if}
		</div>
	</a>
{:else}
	<Button
		variant="primary"
		href={resolve('/timer')}
		class="w-full"
		data-testid="shell-session-chip"
	>
		<Icon name="play_arrow" />
		{m.nav_start_new_session()}
	</Button>
{/if}
