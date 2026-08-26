<script lang="ts" module>
	export type StatusDotTone = 'live' | 'paused' | 'idle';

	const TONE: Record<StatusDotTone, string> = {
		live: 'today-glow bg-secondary',
		paused: 'bg-tertiary',
		idle: 'bg-outline-variant'
	};
</script>

<script lang="ts">
	interface Props {
		tone: StatusDotTone;
		class?: string;
	}

	let { tone, class: className = '' }: Props = $props();
</script>

<span class="inline-block h-2 w-2 shrink-0 rounded-full {TONE[tone]} {className}" aria-hidden="true"
></span>
