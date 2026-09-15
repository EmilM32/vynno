<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { localDateKeyFromDate, type LogDatePreset } from '$lib/time/duration';

	let {
		preset = $bindable(),
		fromDay = $bindable(),
		toDay = $bindable(),
		now,
		timeZone,
		errorText = '',
		/** Desktop date dialog: named presets apply and close. Combined sheet omits this. */
		onnamed
	}: {
		preset: LogDatePreset;
		fromDay: string;
		toDay: string;
		now: Date;
		timeZone?: string;
		errorText?: string;
		onnamed?: (id: Exclude<LogDatePreset, 'custom'>) => void;
	} = $props();

	const todayKey = $derived(localDateKeyFromDate(now, timeZone));

	const presets: { id: Exclude<LogDatePreset, 'custom'>; label: string }[] = [
		{ id: 'all', label: m.logs_filter_dates_all() },
		{ id: 'today', label: m.logs_filter_today() },
		{ id: 'yesterday', label: m.logs_filter_yesterday() },
		{ id: 'last7', label: m.logs_filter_last_7() },
		{ id: 'week', label: m.logs_filter_this_week() },
		{ id: 'month', label: m.logs_filter_this_month() }
	];
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex flex-wrap gap-1"
		role="group"
		aria-label={m.logs_filter_dates()}
		data-testid="logs-date-presets"
	>
		{#each presets as opt (opt.id)}
			<Button
				variant="tab"
				size="sm"
				selected={preset === opt.id}
				aria-pressed={preset === opt.id}
				onclick={() => {
					if (onnamed) onnamed(opt.id);
					else preset = opt.id;
				}}
			>
				{opt.label}
			</Button>
		{/each}
		<Button
			variant="tab"
			size="sm"
			selected={preset === 'custom'}
			aria-pressed={preset === 'custom'}
			onclick={() => (preset = 'custom')}
		>
			{m.logs_filter_custom()}
		</Button>
	</div>

	{#if preset === 'custom'}
		<div class="grid gap-4 sm:grid-cols-2">
			<Field id="logs-range-from" label={m.insights_range_from()}>
				<Input tone="data" type="date" bind:value={fromDay} max={todayKey} class="w-full" />
			</Field>
			<Field id="logs-range-to" label={m.insights_range_to()} error={errorText}>
				<Input tone="data" type="date" bind:value={toDay} max={todayKey} class="w-full" />
			</Field>
		</div>
	{/if}
</div>
