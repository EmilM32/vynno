<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatCompact } from '$lib/time/duration';

	const sessionStore = useSession();

	const items = $derived(sessionStore.projectWeekSummaries);
</script>

<section
	class="flex flex-col rounded-lg border border-outline-variant bg-surface-container p-4"
	aria-label={m.dashboard_active_projects_aria()}
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-headline-md">{m.dashboard_active_projects()}</h2>
		<span class="text-body-sm text-primary">{m.dashboard_this_week()}</span>
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="no-scrollbar -mx-2 flex gap-4 overflow-x-auto px-2 pb-2"
		tabindex="0"
		role="region"
		aria-label={m.dashboard_this_week()}
	>
		{#each items as item (item.project.id)}
			{const pct = $derived(item.progressPercent ?? 0)}
			<a
				href={resolve(`/projects/${encodeURIComponent(item.project.id)}`)}
				class="focus-ring flex min-w-[280px] shrink-0 flex-col gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline"
				data-testid="active-project-card"
			>
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2">
						<div
							class="h-3 w-3 rounded-sm"
							style:background-color={item.project.color}
							aria-hidden="true"
						></div>
						<span class="text-body-md font-medium text-on-surface">{item.project.name}</span>
					</div>
					{#if item.progressPercent != null}
						<span class="font-mono text-code-data text-on-surface-variant">{pct}%</span>
					{/if}
				</div>
				{#if item.progressPercent != null}
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-dim">
						<div
							class="h-full rounded-full"
							style:width="{pct}%"
							style:background-color={item.project.color}
						></div>
					</div>
				{/if}
				<div class="mt-1 flex items-center justify-between">
					<span class="text-body-sm text-on-surface-variant">
						{m.dashboard_logged_this_week({ duration: formatCompact(item.ms) })}
					</span>
					<Icon name="arrow_forward" size="sm" class="text-on-surface-variant" />
				</div>
			</a>
		{/each}
	</div>
</section>
