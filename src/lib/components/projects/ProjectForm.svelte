<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
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
	<div class="flex flex-col gap-1.5">
		<label class="text-body-sm text-on-surface-variant" for="project-name"
			>{m.projects_field_name()}</label
		>
		<input
			id="project-name"
			type="text"
			required
			maxlength="80"
			value={name}
			oninput={onNameInput}
			aria-invalid={fieldErrors.name ? 'true' : undefined}
			aria-describedby={fieldErrors.name ? 'project-name-error' : undefined}
			class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface"
			placeholder={m.projects_name_placeholder()}
			autocomplete="off"
		/>
		{#if fieldErrors.name}
			<p id="project-name-error" class="text-body-sm text-error" role="alert">
				{fieldErrors.name}
			</p>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5">
		<label class="text-body-sm text-on-surface-variant" for="project-code">
			{m.projects_field_code()}
			<span class="text-on-surface-variant">{m.projects_field_code_optional()}</span>
		</label>
		<input
			id="project-code"
			type="text"
			maxlength="8"
			value={code}
			oninput={onCodeInput}
			class="w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface uppercase sm:max-w-xs"
			placeholder={m.projects_code_placeholder()}
			autocomplete="off"
			spellcheck="false"
			aria-invalid={fieldErrors.code ? 'true' : undefined}
			aria-describedby={fieldErrors.code ? 'project-code-error' : undefined}
		/>
		{#if fieldErrors.code}
			<p id="project-code-error" class="text-body-sm text-error" role="alert">
				{fieldErrors.code}
			</p>
		{/if}
	</div>

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
