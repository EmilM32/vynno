<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { deltaDisplay, formatHoursDecimal, formatHoursMinutes } from '$lib/time/duration';

	const prefsStore = usePrefs();
	const sessionStore = useSession();

	const totalMs = $derived(sessionStore.todayTotalMs);
	const totalLabel = $derived(formatHoursMinutes(totalMs));
	const targetMs = $derived(prefsStore.dailyTargetMs);
	const targetLabel = $derived(formatHoursMinutes(targetMs));
	const ratio = $derived(targetMs > 0 ? totalMs / targetMs : 0);
	const pct = $derived(Math.round(ratio * 100));
	const barPct = $derived(Math.min(100, Math.max(0, ratio * 100)));
	const deltaMs = $derived(sessionStore.todayDeltaMs);
	const delta = $derived(deltaDisplay(deltaMs));
	const deltaAbs = $derived(Math.abs(deltaMs));
	const overTarget = $derived(ratio > 1);
</script>

<aside
	class="flex items-center gap-3 border-t border-outline-variant px-4 py-2 lg:gap-5 lg:px-5 lg:py-3"
	aria-labelledby="timer-today-heading"
	data-testid="timer-today-summary"
>
	<h2
		id="timer-today-heading"
		class="shrink-0 font-mono text-code-label tracking-wider text-on-surface-variant uppercase"
	>
		{m.common_today()}
	</h2>
	<p
		class="shrink-0 font-mono text-code-data tracking-tight text-primary"
		data-testid="timer-today-total"
	>
		{totalLabel}
	</p>
	<p class="hidden shrink-0 items-center gap-1 text-body-sm text-on-surface-variant lg:flex">
		{#if delta.icon}
			<Icon name={delta.icon} size="xs" class={delta.ink} />
		{/if}
		<span class={delta.ink}>
			{formatHoursDecimal(deltaAbs)}
		</span>
		<span>{m.dashboard_vs_yesterday()}</span>
	</p>
	<span class="ml-auto shrink-0 font-mono text-code-label text-on-surface-variant lg:hidden">
		{pct}%
	</span>
	<div class="ml-auto hidden max-w-sm min-w-0 flex-1 items-center gap-3 lg:flex">
		<ProgressBar
			value={barPct}
			size="sm"
			fill={overTarget ? 'secondary' : 'primary'}
			label={m.timer_today_aria()}
			class="min-w-16 flex-1"
		/>
		<span class="shrink-0 font-mono text-code-label text-on-surface-variant">
			{pct}% · {targetLabel}
		</span>
	</div>
</aside>
