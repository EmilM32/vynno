<script lang="ts">
	import { activityChipClass } from '$lib/time/activity-styles';
	import type { ActivityType } from '$lib/types/domain';

	let {
		type,
		class: className = ''
	}: {
		type: ActivityType;
		class?: string;
	} = $props();

	const label = $derived(type.name);
	const colorClass = $derived(activityChipClass(type.color));
</script>

<!-- Truncates in place; the full name stays reachable through `title`. -->
<span
	class="inline-block max-w-full min-w-0 truncate rounded-[2px] border px-2 py-0.5 align-middle font-mono text-[10px] tracking-wider uppercase {colorClass} {className}"
	title={label}
	data-testid="activity-chip"
>
	<bdi>{label}</bdi>
</span>
