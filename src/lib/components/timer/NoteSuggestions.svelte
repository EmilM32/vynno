<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Project } from '$lib/types/domain';
	import type { PastTask } from './note-suggestions';

	/**
	 * Listbox under the Timer note field. Focus stays in the input (aria-activedescendant),
	 * so options cancel mousedown and the input owns the keyboard.
	 */
	let {
		id,
		items,
		activeIndex,
		projectOf,
		onpick,
		onhover
	}: {
		id: string;
		items: PastTask[];
		activeIndex: number;
		projectOf: (id: string) => Project | undefined;
		onpick: (task: PastTask) => void;
		onhover: (index: number) => void;
	} = $props();
</script>

<ul
	{id}
	role="listbox"
	aria-label={m.timer_note_suggestions_aria()}
	class="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-DEFAULT border border-outline-variant bg-surface-container py-1 shadow-xl"
	data-testid="note-suggestions"
>
	{#each items as task, i (task.key)}
		{const project = $derived(projectOf(task.projectId))}
		{const active = $derived(i === activeIndex)}
		<li
			id={`${id}-${i}`}
			role="option"
			aria-selected={active}
			class="flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors {active
				? 'bg-surface-container-high text-primary'
				: 'text-on-surface hover:bg-surface-variant'}"
			onmouseenter={() => onhover(i)}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => onpick(task)}
			onkeydown={(e) => {
				if (e.key === 'Enter') onpick(task);
			}}
		>
			<span
				class="h-2 w-2 shrink-0 rounded-full"
				style:background-color={project?.color}
				aria-hidden="true"
			></span>
			<bdi class="min-w-0 flex-1 truncate font-mono text-code-data">{task.note}</bdi>
			{#if task.ticketId}
				<bdi class="max-w-[30%] shrink-0 truncate font-mono text-code-label text-on-surface-variant"
					>{task.ticketId}</bdi
				>
			{/if}
			<bdi class="max-w-[30%] shrink-0 truncate font-mono text-code-label text-on-surface-variant"
				>{project?.code ?? project?.name ?? ''}</bdi
			>
		</li>
	{/each}
</ul>
