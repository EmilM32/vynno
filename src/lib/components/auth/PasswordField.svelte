<script lang="ts">
	import Field from '$lib/components/ui/Field.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		id,
		label,
		name = 'password',
		autocomplete = 'current-password',
		value = $bindable(''),
		error = '',
		showLabel = m.login_show_password(),
		hideLabel = m.login_hide_password(),
		onkeydown
	}: {
		id: string;
		label: string;
		name?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		value?: string;
		error?: string;
		showLabel?: string;
		hideLabel?: string;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();

	let visible = $state(false);
</script>

<Field {id} {label} {error}>
	<Input
		{id}
		type={visible ? 'text' : 'password'}
		{name}
		required
		{autocomplete}
		spellcheck="false"
		bind:value
		{onkeydown}
		class="w-full"
	>
		{#snippet trailing()}
			<!-- form id does not exist: this must not be the form's default Enter button. -->
			<IconButton
				icon={visible ? 'visibility_off' : 'visibility'}
				label={visible ? hideLabel : showLabel}
				form="vynno-unassociated"
				class="absolute inset-y-0 right-0"
				aria-pressed={visible}
				onclick={() => (visible = !visible)}
			/>
		{/snippet}
	</Input>
</Field>
