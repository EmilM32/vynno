<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { deltaDisplay, formatHoursDecimal, formatHoursMinutes } from '$lib/time/duration';

	let { class: className }: { class?: string } = $props();

	const sessionStore = useSession();

	const totalLabel = $derived(formatHoursMinutes(sessionStore.todayTotalMs));
	const deltaMs = $derived(sessionStore.todayDeltaMs);
	const delta = $derived(deltaDisplay(deltaMs));
	const deltaAbs = $derived(Math.abs(deltaMs));
</script>

<div
	class={[
		'flex flex-col rounded-lg border border-outline-variant bg-surface-container px-4 py-3 md:p-4',
		className
	]}
>
	<div class="mb-1 md:mb-2">
		<h2 class="font-mono text-code-label tracking-wider text-on-surface-variant uppercase">
			{m.dashboard_today_total()}
		</h2>
	</div>
	<div class="mt-auto flex items-end justify-between gap-3 md:block">
		<div class="font-mono text-code-display tracking-tight text-primary" data-testid="today-total">
			{totalLabel}
		</div>
		<div class="flex items-center gap-1 text-body-sm text-on-surface-variant md:mt-1">
			{#if delta.icon}
				<Icon name={delta.icon} size="xs" class={delta.ink} />
			{/if}
			<span class={delta.ink}>
				{formatHoursDecimal(deltaAbs)}
			</span>
			<span>{m.dashboard_vs_yesterday()}</span>
		</div>
	</div>
</div>
