<script lang="ts" module>
	export type StatusDotTone = 'active' | 'paused' | 'idle' | 'live';

	const TONE: Record<StatusDotTone, string> = {
		active: 'bg-secondary blink',
		paused: 'bg-tertiary',
		idle: 'bg-outline-variant',
		live: 'today-glow bg-secondary'
	};
</script>

<script lang="ts">
	interface Props {
		tone: StatusDotTone;
		class?: string;
	}

	let { tone, class: className = '' }: Props = $props();
</script>

<span class="h-2 w-2 shrink-0 rounded-full {TONE[tone]} {className}" aria-hidden="true"></span>
