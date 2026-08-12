<script lang="ts">
	import { sessionStore } from '$lib/stores/session.svelte';

	const locked = $derived(!!sessionStore.activeSession);

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !locked) {
			e.preventDefault();
			sessionStore.start();
		}
	}
</script>

<div class="flex w-full flex-col gap-3">
	<div class="group relative w-full">
		<span
			class="material-symbols-outlined absolute top-1/2 left-3 -translate-y-1/2 text-outline-variant transition-colors group-focus-within:text-primary"
			aria-hidden="true">prompt_suggestion</span
		>
		<input
			class="w-full rounded border border-outline-variant bg-surface-container-low py-3 pr-4 pl-10 font-mono text-code-data text-on-surface outline-none transition-all placeholder:text-outline-variant focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
			type="text"
			placeholder="What are you working on? (e.g. 'Fixing Bug #402')"
			bind:value={sessionStore.draftNote}
			disabled={locked}
			onkeydown={onKeydown}
			aria-label="Task description"
		/>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<label class="font-mono text-code-label text-on-surface-variant" for="project-select"
			>Project</label
		>
		<select
			id="project-select"
			class="min-w-[10rem] flex-1 rounded border border-outline-variant bg-surface-container-low px-3 py-1.5 font-mono text-code-label text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none"
			bind:value={sessionStore.draftProjectId}
			disabled={locked}
		>
			{#each sessionStore.projects as project (project.id)}
				<option value={project.id}>{project.name}</option>
			{/each}
		</select>
	</div>
</div>
