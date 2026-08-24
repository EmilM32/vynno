<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatHoursDecimal, formatHoursMinutes } from '$lib/time/duration';

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
	const deltaPositive = $derived(deltaMs >= 0);
	const deltaAbs = $derived(Math.abs(deltaMs));
	const overTarget = $derived(ratio > 1);
</script>

<aside
	class="hidden items-center gap-5 border-t border-outline-variant px-5 py-3 lg:flex"
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
	<p class="flex shrink-0 items-center gap-1 text-body-sm text-on-surface-variant">
		<Icon
			name={deltaPositive ? 'arrow_upward' : 'arrow_downward'}
			size="xs"
			class={deltaPositive ? 'text-secondary' : 'text-tertiary'}
		/>
		<span class={deltaPositive ? 'text-secondary' : 'text-tertiary'}>
			{formatHoursDecimal(deltaAbs)}
		</span>
		<span>{m.dashboard_vs_yesterday()}</span>
	</p>
	<div class="ml-auto flex max-w-sm min-w-0 flex-1 items-center gap-3">
		<div
			class="h-1 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-dim"
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.min(100, pct)}
			aria-label={m.timer_today_aria()}
		>
			<div
				class="h-full rounded-full {overTarget ? 'bg-secondary' : 'bg-primary'}"
				style:width="{barPct}%"
			></div>
		</div>
		<span class="shrink-0 font-mono text-code-label text-on-surface-variant">
			{pct}% · {targetLabel}
		</span>
	</div>
</aside>
