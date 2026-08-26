<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
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
	<Field
		id="activity-type-name"
		label={m.settings_activity_type_name()}
		hint={m.settings_activity_type_name_hint()}
	>
		<Input tone="data" type="text" maxlength="32" bind:value={name} class="w-full" />
	</Field>
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
