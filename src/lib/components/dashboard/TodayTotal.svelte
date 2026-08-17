<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';

	const sessionStore = useSession();
	import { formatHoursDecimal, formatHoursMinutes } from '$lib/time/duration';

	const totalLabel = $derived(formatHoursMinutes(sessionStore.todayTotalMs));
	const deltaMs = $derived(sessionStore.todayDeltaMs);
	const deltaPositive = $derived(deltaMs >= 0);
	const deltaAbs = $derived(Math.abs(deltaMs));
</script>

<div
	class="relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container p-4 md:col-span-4"
>
	<div class="mb-2 flex items-start justify-between">
		<h2 class="text-body-sm tracking-wider text-on-surface-variant uppercase">
			{m.dashboard_today_total()}
		</h2>
		<span class="today-glow h-2 w-2 rounded-full bg-secondary" aria-hidden="true"></span>
	</div>
	<div class="mt-auto">
		<div class="font-mono text-code-display tracking-tight text-primary" data-testid="today-total">
			{totalLabel}
		</div>
		<div class="mt-1 flex items-center gap-1 text-body-sm text-on-surface-variant">
			<span
				class="material-symbols-outlined text-[14px] {deltaPositive
					? 'text-secondary'
					: 'text-tertiary'}"
				aria-hidden="true"
			>
				{deltaPositive ? 'arrow_upward' : 'arrow_downward'}
			</span>
			<span class={deltaPositive ? 'text-secondary' : 'text-tertiary'}>
				{formatHoursDecimal(deltaAbs)}
			</span>
			<span>{m.dashboard_vs_yesterday()}</span>
		</div>
	</div>
	<div class="pointer-events-none absolute right-0 bottom-0 opacity-10" aria-hidden="true">
		<svg
			fill="none"
			height="80"
			viewBox="0 0 120 80"
			width="120"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M0 80L80 0H120V80H0Z" fill="url(#paint0_linear_today)"></path>
			<defs>
				<linearGradient
					gradientUnits="userSpaceOnUse"
					id="paint0_linear_today"
					x1="60"
					x2="60"
					y1="0"
					y2="80"
				>
					<stop stop-color="var(--color-primary)"></stop>
					<stop offset="1" stop-color="var(--color-primary)" stop-opacity="0"></stop>
				</linearGradient>
			</defs>
		</svg>
	</div>
</div>
