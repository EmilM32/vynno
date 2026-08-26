<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
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
	class="relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container px-4 py-3 md:col-span-4 md:p-4"
>
	<div class="mb-1 flex items-start justify-between md:mb-2">
		<h2 class="text-body-sm tracking-wider text-on-surface-variant uppercase">
			{m.dashboard_today_total()}
		</h2>
		<StatusDot tone="live" class="hidden md:block" />
	</div>
	<div class="mt-auto flex items-end justify-between gap-3 md:block">
		<div class="font-mono text-code-display tracking-tight text-primary" data-testid="today-total">
			{totalLabel}
		</div>
		<div class="flex items-center gap-1 text-body-sm text-on-surface-variant md:mt-1">
			<Icon
				name={deltaPositive ? 'arrow_upward' : 'arrow_downward'}
				size="xs"
				class={deltaPositive ? 'text-secondary' : 'text-tertiary'}
			/>
			<span class={deltaPositive ? 'text-secondary' : 'text-tertiary'}>
				{formatHoursDecimal(deltaAbs)}
			</span>
			<span>{m.dashboard_vs_yesterday()}</span>
		</div>
	</div>
	<div
		class="pointer-events-none absolute right-0 bottom-0 hidden opacity-10 md:block"
		aria-hidden="true"
	>
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
