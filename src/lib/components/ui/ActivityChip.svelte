<script lang="ts">
	import { ACTIVITY_CHIP_CLASS } from '$lib/time/activity-styles';
	import { ACTIVITY_LABELS, type ActivityType } from '$lib/types/domain';

	let {
		type,
		class: className = ''
	}: {
		type: ActivityType;
		class?: string;
	} = $props();

	const label = $derived(ACTIVITY_LABELS[type]);
	const colorClass = $derived(ACTIVITY_CHIP_CLASS[type]);
</script>

<span
	class="rounded-[2px] border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase {colorClass} {className}"
>
	{label}
</span>
