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
		'relative flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container px-4 py-3 md:p-4',
		className
	]}
>
	<div class="mb-1 md:mb-2">
		<h2 class="text-body-sm tracking-wider text-on-surface-variant uppercase">
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
