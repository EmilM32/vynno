<script lang="ts">
	import { resolve } from '$app/paths';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	/** The running session on the dashboard toolbar's right edge. Renders nothing when idle. */
	const sessionStore = useSession();

	const session = $derived(sessionStore.activeSession);
	const project = $derived(sessionStore.activeProject);
	const projectName = $derived(project?.name ?? m.common_unknown());
	const ariaLabel = $derived.by(() => {
		const note = session?.note?.trim();
		return m.shell_session_chip_aria({
			status: m.shell_session_recording(),
			elapsed: sessionStore.elapsedLabel,
			detail: note ? `${projectName} · ${note}` : projectName
		});
	});
</script>

{#if session}
	<a
		href={resolve('/timer')}
		class="focus-ring flex items-center gap-2 rounded border border-primary px-2.5 py-1 transition-colors hover:bg-surface-variant"
		aria-label={ariaLabel}
		data-testid="dashboard-session-chip"
	>
		<StatusDot tone="live" />
		{#if project}<ColorDot color={project.color} />{/if}
		<span class="max-w-40 truncate text-body-sm text-on-surface"><bdi>{projectName}</bdi></span>
		<span class="font-mono text-code-data text-primary tabular-nums"
			>{sessionStore.elapsedLabel}</span
		>
	</a>
{/if}
