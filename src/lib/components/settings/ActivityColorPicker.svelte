<script lang="ts">
	import SwatchPicker from '$lib/components/ui/SwatchPicker.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		ACTIVITY_COLOR_TOKENS,
		activitySwatchClass,
		type ActivityColorToken
	} from '$lib/time/activity-styles';

	interface Props {
		value: string;
		id?: string;
		onchange?: (color: string) => void;
	}

	let { value = $bindable('primary'), id = 'activity-color', onchange }: Props = $props();

	const options = ACTIVITY_COLOR_TOKENS.map((color) => ({
		value: color,
		label: color,
		className: activitySwatchClass(color)
	}));

	function onPick(color: string) {
		onchange?.(color as ActivityColorToken);
	}
</script>

<SwatchPicker bind:value {id} {options} onchange={onPick} label={m.activity_types_color_aria()} />
