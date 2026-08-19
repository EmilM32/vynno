<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		id,
		label,
		name = 'password',
		autocomplete = 'current-password',
		value = $bindable(''),
		error = '',
		describedBy,
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
		describedBy?: string;
		showLabel?: string;
		hideLabel?: string;
		onkeydown?: (e: KeyboardEvent) => void;
	} = $props();

	let visible = $state(false);

	const errorId = $derived(`${id}-error`);
	const described = $derived(
		[error ? errorId : undefined, describedBy].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="flex flex-col gap-1.5">
	<label class="text-body-sm text-on-surface-variant" for={id}>{label}</label>
	<div class="relative">
		<input
			{id}
			type={visible ? 'text' : 'password'}
			{name}
			required
			{autocomplete}
			spellcheck="false"
			bind:value
			{onkeydown}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={described}
			class="min-h-10 w-full rounded border border-outline-variant bg-surface-container-low py-2.5 pr-11 pl-3 text-body-md text-on-surface"
		/>
		<!-- form id does not exist: this must not be the form's default Enter button. -->
		<button
			type="button"
			form="vynno-unassociated"
			class="focus-ring absolute inset-y-0 right-0 flex min-w-10 items-center justify-center text-on-surface-variant hover:text-on-surface"
			aria-label={visible ? hideLabel : showLabel}
			aria-pressed={visible}
			onclick={() => (visible = !visible)}
		>
			<span class="material-symbols-outlined text-[20px]" aria-hidden="true">
				{visible ? 'visibility_off' : 'visibility'}
			</span>
		</button>
	</div>
	{#if error}
		<p id={errorId} class="text-body-sm text-error" role="alert">{error}</p>
	{/if}
</div>
