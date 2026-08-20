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

<span
	class="rounded-[2px] border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase {colorClass} {className}"
	data-testid="activity-chip"
>
	{label}
</span>
