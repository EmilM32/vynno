<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { noteRejectMessage, ticketRejectMessage } from '$lib/text/field-error';
	import { normalizeNote, normalizeTicketId } from '$lib/text/normalize';

	const sessionStore = useSession();

	const live = $derived(sessionStore.activeSession);
	const locked = $derived(sessionStore.busy);
	const noteResult = $derived(normalizeNote(sessionStore.draftNote));
	const ticketResult = $derived(normalizeTicketId(sessionStore.draftTicket));
	const noteError = $derived(
		noteResult.ok || (live != null && sessionStore.draftNote === live.note)
			? ''
			: noteRejectMessage(noteResult.reason)
	);
	const ticketError = $derived(
		ticketResult.ok || (live != null && sessionStore.draftTicket === (live.ticketId ?? ''))
			? ''
			: ticketRejectMessage(ticketResult.reason)
	);

	function applyDraft(): { note: string; ticketId: string } | null {
		if (!noteResult.ok || !ticketResult.ok) return null;
		sessionStore.draftNote = noteResult.value;
		sessionStore.draftTicket = ticketResult.value;
		return { note: noteResult.value, ticketId: ticketResult.value };
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || locked) return;
		e.preventDefault();
		const draft = applyDraft();
		if (!draft) return;
		if (live) {
			void sessionStore.updateSession(live.id, { note: draft.note });
		} else {
			sessionStore.start();
		}
	}

	function onNoteBlur() {
		if (!live || locked) return;
		if (!noteResult.ok) return;
		if (noteResult.value === live.note) {
			sessionStore.draftNote = noteResult.value;
			return;
		}
		sessionStore.draftNote = noteResult.value;
		void sessionStore.updateSession(live.id, { note: noteResult.value });
	}

	function onProjectChange() {
		if (!live || locked) return;
		if (sessionStore.draftProjectId === live.projectId) return;
		void sessionStore.updateSession(live.id, { projectId: sessionStore.draftProjectId });
	}

	function onActivityChange() {
		if (!live || locked) return;
		const next = sessionStore.draftActivityType || null;
		if ((live.activityTypeId ?? null) === next) return;
		void sessionStore.updateSession(live.id, { activityTypeId: next });
	}

	function onTicketBlur() {
		if (!live || locked) return;
		if (!ticketResult.ok) return;
		const next = ticketResult.value || null;
		sessionStore.draftTicket = ticketResult.value;
		if ((live.ticketId ?? null) === next) return;
		void sessionStore.updateSession(live.id, { ticketId: next });
	}

	const LG_MQ = '(min-width: 1024px)';
	let dense = $state(false);

	function watchDense(_node: HTMLElement) {
		const mq = window.matchMedia(LG_MQ);
		const sync = () => {
			dense = mq.matches;
		};
		mq.addEventListener('change', sync);
		sync();
		return () => mq.removeEventListener('change', sync);
	}

	const fieldSize = $derived(dense ? 'sm' : 'md');
</script>

<div
	class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_7.5rem] lg:items-end"
	{@attach watchDense}
>
	<div class="flex min-w-0 flex-col gap-1.5">
		<label class="font-mono text-code-label text-on-surface-variant" for="task-note"
			>{m.timer_task_aria()}</label
		>
		<div class="group relative w-full">
			<Icon
				name="prompt_suggestion"
				size="2xl"
				class="absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
			/>
			<input
				id="task-note"
				class="w-full rounded border border-outline-variant bg-surface-container-low py-3 pr-4 pl-10 font-mono text-code-data text-on-surface transition-colors placeholder:text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-70 lg:border-transparent lg:bg-transparent lg:py-2 lg:pl-10"
				type="text"
				placeholder={m.timer_task_placeholder()}
				bind:value={sessionStore.draftNote}
				disabled={locked}
				onkeydown={onKeydown}
				onblur={onNoteBlur}
			/>
		</div>
		{#if noteError}
			<p class="text-body-sm text-error" role="alert">{noteError}</p>
		{/if}
	</div>

	<div class="flex min-w-0 flex-col gap-1.5">
		<label class="font-mono text-code-label text-on-surface-variant" for="project-select"
			>{m.timer_project_label()}</label
		>
		<Select
			id="project-select"
			size={fieldSize}
			class="w-full"
			bind:value={sessionStore.draftProjectId}
			disabled={locked}
			onchange={onProjectChange}
		>
			{#each sessionStore.projects as project (project.id)}
				<option value={project.id} dir="auto">{project.name}</option>
			{/each}
		</Select>
	</div>

	<div class="grid grid-cols-2 gap-3 lg:contents">
		<div class="flex min-w-0 flex-col gap-1.5">
			<label class="font-mono text-code-label text-on-surface-variant" for="activity-select"
				>{m.timer_activity_label()}</label
			>
			<Select
				id="activity-select"
				size={fieldSize}
				class="w-full"
				bind:value={sessionStore.draftActivityType}
				disabled={locked}
				data-testid="activity-select"
				onchange={onActivityChange}
			>
				<option value="">{m.timer_activity_none()}</option>
				{#each sessionStore.activityTypes as type (type.id)}
					<option value={type.id} dir="auto">{type.name}</option>
				{/each}
			</Select>
		</div>
		<div class="flex min-w-0 flex-col gap-1.5">
			<label class="font-mono text-code-label text-on-surface-variant" for="task-ticket"
				>{m.timer_ticket_label()}</label
			>
			<Input
				id="task-ticket"
				tone="code"
				size={fieldSize}
				class="w-full"
				placeholder={m.timer_ticket_placeholder()}
				bind:value={sessionStore.draftTicket}
				disabled={locked}
				onblur={onTicketBlur}
				autocomplete="off"
			/>
			{#if ticketError}
				<p class="text-body-sm text-error" role="alert">{ticketError}</p>
			{/if}
		</div>
	</div>
</div>
