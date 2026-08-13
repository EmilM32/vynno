<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { sessionStore } from '$lib/stores/session.svelte';

	const locked = $derived(!!sessionStore.activeSession);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !locked) {
			e.preventDefault();
			sessionStore.start();
		}
	}
</script>

<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
	<div class="flex min-w-0 flex-1 flex-col gap-1.5">
		<label class="font-mono text-code-label text-on-surface-variant lg:sr-only" for="task-note"
			>{m.timer_task_aria()}</label
		>
		<div class="group relative w-full">
			<span
				class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
				aria-hidden="true">prompt_suggestion</span
			>
			<input
				id="task-note"
				class="w-full rounded border border-outline-variant bg-surface-container-low py-3 pr-4 pl-10 font-mono text-code-data text-on-surface transition-colors placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-70 lg:border-transparent lg:bg-transparent lg:py-2 lg:pl-10"
				type="text"
				placeholder={m.timer_task_placeholder()}
				bind:value={sessionStore.draftNote}
				disabled={locked}
				onkeydown={onKeydown}
			/>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 lg:shrink-0">
		<label class="font-mono text-code-label text-on-surface-variant lg:sr-only" for="project-select"
			>{m.timer_project_label()}</label
		>
		<select
			id="project-select"
			class="native-select min-w-[10rem] flex-1 rounded border border-outline-variant bg-surface-container-low py-1.5 pl-3 font-mono text-code-label text-on-surface disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none lg:w-48"
			bind:value={sessionStore.draftProjectId}
			disabled={locked}
		>
			{#each sessionStore.projects as project (project.id)}
				<option value={project.id}>{project.name}</option>
			{/each}
		</select>
	</div>
</div>
