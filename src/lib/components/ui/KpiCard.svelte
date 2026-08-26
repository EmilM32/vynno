<script lang="ts" module>
	export type KpiValueTone = 'primary' | 'default';
	export type KpiCaptionTone = 'muted' | 'positive' | 'negative';

	const VALUE: Record<KpiValueTone, string> = {
		primary: 'text-primary',
		default: 'text-on-surface'
	};

	const CAPTION: Record<KpiCaptionTone, string> = {
		muted: 'text-on-surface-variant',
		positive: 'text-secondary',
		negative: 'text-error'
	};
</script>

<script lang="ts">
	interface Props {
		label: string;
		value: string;
		caption?: string;
		valueTone?: KpiValueTone;
		captionTone?: KpiCaptionTone;
		/** Applied to the metric, matching existing test ids. */
		valueTestId?: string;
	}

	let {
		label,
		value,
		caption,
		valueTone = 'default',
		captionTone = 'muted',
		valueTestId
	}: Props = $props();
</script>

<div
	class="flex flex-col justify-between rounded-lg border border-outline-variant bg-surface-container p-2 sm:p-4"
>
	<span
		class="font-mono text-[10px] tracking-wider text-on-surface-variant uppercase sm:text-code-label"
		>{label}</span
	>
	<div class="mt-2 flex flex-col gap-0.5 sm:mt-4 sm:flex-row sm:items-baseline sm:gap-2">
		<span
			class="font-mono text-code-data tabular-nums sm:text-code-display {VALUE[valueTone]}"
			data-testid={valueTestId}>{value}</span
		>
		{#if caption}
			<span class="font-mono text-[10px] sm:text-code-label {CAPTION[captionTone]}">{caption}</span>
		{/if}
	</div>
</div>
