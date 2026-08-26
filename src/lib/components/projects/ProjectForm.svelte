<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { defaultProjectColor, suggestCode } from '$lib/projects/palette';
	import { validateProjectFieldErrors, type ProjectFieldErrorKey } from '$lib/projects/validate';
	import type { Project } from '$lib/types/domain';
	import ProjectColorPicker from './ProjectColorPicker.svelte';

	interface Props {
		mode: 'create' | 'edit';
		project?: Project;
		pending?: boolean;
		onsubmit: (values: { name: string; color: string; code: string }) => void;
		oncancel: () => void;
	}

	let { mode, project, pending = false, onsubmit, oncancel }: Props = $props();

	// Snapshot initial values — parent remounts via {#key} when mode/project changes.
	// svelte-ignore state_referenced_locally
	let name = $state(project?.name ?? '');
	// svelte-ignore state_referenced_locally
	let code = $state(project?.code ?? '');
	// svelte-ignore state_referenced_locally
	let color = $state(project?.color ?? defaultProjectColor());
	// svelte-ignore state_referenced_locally
	let codeTouched = $state(mode === 'edit');
	let fieldErrors = $state<Partial<Record<ProjectFieldErrorKey, string>>>({});

	function onNameInput(e: Event) {
		name = (e.currentTarget as HTMLInputElement).value;
		if (mode === 'create' && !codeTouched) {
			code = suggestCode(name);
		}
	}

	function onCodeInput(e: Event) {
		codeTouched = true;
		code = (e.currentTarget as HTMLInputElement).value;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (pending) return;
		const errors = validateProjectFieldErrors({ name, color, code });
		fieldErrors = errors;
		if (errors.name || errors.code || errors.color) return;
		onsubmit({ name, color, code });
	}
</script>

<form class="flex flex-col gap-4" onsubmit={handleSubmit} novalidate>
	<Field id="project-name" label={m.projects_field_name()} error={fieldErrors.name}>
		<Input
			type="text"
			required
			maxlength="80"
			value={name}
			oninput={onNameInput}
			placeholder={m.projects_name_placeholder()}
			autocomplete="off"
			class="w-full"
		/>
	</Field>

	<Field id="project-code" label={m.projects_field_code()} error={fieldErrors.code}>
		{#snippet extra()}
			<span class="text-on-surface-variant"> {m.projects_field_code_optional()}</span>
		{/snippet}
		<Input
			tone="code"
			type="text"
			maxlength="8"
			value={code}
			oninput={onCodeInput}
			class="w-full uppercase sm:max-w-xs"
			placeholder={m.projects_code_placeholder()}
			autocomplete="off"
			spellcheck="false"
		/>
	</Field>

	<div class="flex flex-col gap-1.5">
		<span class="text-body-sm text-on-surface-variant" id="project-color-label"
			>{m.projects_field_color()}</span
		>
		<ProjectColorPicker bind:value={color} id="project-color" />
		{#if fieldErrors.color}
			<p id="project-color-error" class="text-body-sm text-error" role="alert">
				{fieldErrors.color}
			</p>
		{/if}
	</div>

	<div class="mt-1 flex flex-wrap justify-end gap-2">
		<Button variant="secondary" onclick={oncancel}>
			{m.common_cancel()}
		</Button>
		<Button variant="primary" type="submit" disabled={pending}>
			{mode === 'create' ? m.projects_create() : m.projects_save()}
		</Button>
	</div>
</form>
