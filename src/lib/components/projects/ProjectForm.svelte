<script lang="ts">
	import { defaultProjectColor, suggestCode } from '$lib/projects/palette';
	import type { Project } from '$lib/types/domain';
	import ProjectColorPicker from './ProjectColorPicker.svelte';

	interface Props {
		mode: 'create' | 'edit';
		project?: Project;
		onsubmit: (values: { name: string; color: string; code: string }) => void;
		oncancel: () => void;
	}

	let { mode, project, onsubmit, oncancel }: Props = $props();

	// Snapshot initial values — parent remounts via {#key} when mode/project changes.
	// svelte-ignore state_referenced_locally
	let name = $state(project?.name ?? '');
	// svelte-ignore state_referenced_locally
	let code = $state(project?.code ?? '');
	// svelte-ignore state_referenced_locally
	let color = $state(project?.color ?? defaultProjectColor());
	// svelte-ignore state_referenced_locally
	let codeTouched = $state(mode === 'edit');

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
		onsubmit({ name, color, code });
	}
</script>

<form
	class="rounded-lg border border-outline-variant bg-surface-container p-4"
	onsubmit={handleSubmit}
	aria-labelledby="project-form-title"
>
	<h2 id="project-form-title" class="mb-4 text-headline-md text-on-surface">
		{mode === 'create' ? 'New project' : 'Edit project'}
	</h2>

	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<label class="text-body-sm text-on-surface-variant" for="project-name">Name</label>
			<input
				id="project-name"
				type="text"
				required
				maxlength="80"
				value={name}
				oninput={onNameInput}
				class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none"
				placeholder="e.g. API Gateway"
				autocomplete="off"
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<label class="text-body-sm text-on-surface-variant" for="project-code">
				Code
				<span class="text-outline"> (optional chip)</span>
			</label>
			<input
				id="project-code"
				type="text"
				maxlength="8"
				value={code}
				oninput={onCodeInput}
				class="focus-ring w-full rounded border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-code-label text-on-surface outline-none uppercase sm:max-w-xs"
				placeholder="AUTH"
				autocomplete="off"
				spellcheck="false"
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-body-sm text-on-surface-variant">Color</span>
			<ProjectColorPicker bind:value={color} id="project-color" />
		</div>

		<div class="mt-1 flex flex-wrap gap-2">
			<button
				type="submit"
				class="focus-ring rounded bg-primary px-4 py-2 font-mono text-code-data font-medium text-background transition-colors hover:bg-primary-container"
			>
				{mode === 'create' ? 'Create project' : 'Save changes'}
			</button>
			<button
				type="button"
				class="focus-ring rounded border border-outline-variant bg-surface-container-low px-4 py-2 text-body-md text-on-surface transition-colors hover:border-outline"
				onclick={oncancel}
			>
				Cancel
			</button>
		</div>
	</div>
</form>
