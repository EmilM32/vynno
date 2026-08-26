<script lang="ts" module>
	export type ProgressBarSize = 'sm' | 'md';

	const SIZE: Record<ProgressBarSize, string> = {
		sm: 'h-1',
		md: 'h-1.5'
	};
</script>

<script lang="ts">
	interface Props {
		value: number;
		/** Accessible name — required; colour is not enough. */
		label: string;
		size?: ProgressBarSize;
		/** Token fill, or a hex when the bar tracks a project colour. */
		fill?: 'primary' | 'secondary' | (string & {});
		class?: string;
	}

	let { value, label, size = 'md', fill = 'primary', class: className = '' }: Props = $props();

	const pct = $derived(Math.min(100, Math.max(0, value)));
	const token = $derived(fill === 'primary' || fill === 'secondary');
	const fillClass = $derived(
		fill === 'secondary' ? 'bg-secondary' : fill === 'primary' ? 'bg-primary' : ''
	);
</script>

<div
	class="overflow-hidden rounded-full bg-surface-dim {SIZE[size]} {className}"
	role="progressbar"
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={Math.round(pct)}
	aria-label={label}
>
	<div
		class="h-full rounded-full {fillClass}"
		style:width="{pct}%"
		style:background-color={token ? undefined : fill}
	></div>
</div>
