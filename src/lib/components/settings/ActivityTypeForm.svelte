<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		ACTIVITY_COLOR_TOKENS,
		isActivityColorToken,
		type ActivityColorToken
	} from '$lib/time/activity-styles';
	import type { ActivityType } from '$lib/types/domain';
	import ActivityColorPicker from './ActivityColorPicker.svelte';

	let {
		mode,
		type,
		pending = false,
		onsubmit,
		oncancel
	}: {
		mode: 'create' | 'edit';
		type?: ActivityType;
		pending?: boolean;
		onsubmit: (values: { name: string; color: ActivityColorToken }) => void;
		oncancel: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(type?.name ?? '');
	// svelte-ignore state_referenced_locally
	let color = $state<ActivityColorToken>(
		type && isActivityColorToken(type.color) ? type.color : ACTIVITY_COLOR_TOKENS[0]
	);

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || pending) return;
		onsubmit({ name: trimmed, color });
	}
</script>

<form class="flex flex-col gap-3" onsubmit={handleSubmit}>
	<label class="flex flex-col gap-1 text-body-md text-on-surface" for="activity-type-name">
		{m.settings_activity_type_name()}
		<input
			id="activity-type-name"
			type="text"
			maxlength="32"
			bind:value={name}
			class="rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-data text-on-surface"
		/>
		<span class="text-body-sm text-on-surface-variant">{m.settings_activity_type_name_hint()}</span>
	</label>
	<div class="flex flex-col gap-1">
		<span class="text-body-md text-on-surface">{m.settings_activity_type_color()}</span>
		<ActivityColorPicker bind:value={color} />
	</div>
	<div class="flex flex-wrap justify-end gap-2">
		<Button variant="secondary" onclick={oncancel}>
			{m.common_cancel()}
		</Button>
		<Button variant="primary" type="submit" disabled={pending || !name.trim()}>
			{mode === 'edit' ? m.settings_activity_type_save() : m.settings_activity_type_add()}
		</Button>
	</div>
</form>
