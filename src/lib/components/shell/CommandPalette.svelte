<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { trapFocus } from '$lib/a11y/focus-trap';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { normalizeNote, normalizeTicketId } from '$lib/text/normalize';
	import { recentTasks, type RecentTask } from '$lib/time/aggregates';
	import { filterCommands, type Command, type CommandGroupId } from './commands';
	import { NAV_ITEMS, type AppRoute } from './nav';

	const RECENT_TASK_LIMIT = 8;

	const sessionStore = useSession();

	let query = $state('');
	let selected = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();
	let listEl: HTMLDivElement | undefined = $state();

	const open = $derived(commandPalette.open);

	const GROUP_LABEL: Record<CommandGroupId, () => string> = {
		actions: () => m.command_group_actions(),
		recent: () => m.timer_recent_tasks(),
		projects: () => m.nav_projects(),
		navigate: () => m.command_group_navigate()
	};

	function go(href: AppRoute) {
		void goto(resolve(href));
	}

	/** Failures land on Timer, where the error banner lives. */
	async function startFromDraft() {
		const note = normalizeNote(sessionStore.draftNote);
		const ticket = normalizeTicketId(sessionStore.draftTicket);
		if (!note.ok || !ticket.ok) return go('/timer');
		sessionStore.draftNote = note.value;
		sessionStore.draftTicket = ticket.value;
		await sessionStore.start();
		if (sessionStore.error) go('/timer');
	}

	async function stop() {
		await sessionStore.stop();
		if (sessionStore.error) go('/timer');
	}

	async function resume(task: RecentTask) {
		const ok = await sessionStore.restartFromTask({
			projectId: task.projectId,
			note: task.note,
			ticketId: task.ticketId,
			activityTypeId: task.activityTypeId
		});
		if (!ok) go('/timer');
	}

	const actionCommands = $derived.by((): Command[] => {
		const live = sessionStore.activeSession;
		if (live) {
			return [
				{
					id: 'action:stop',
					group: 'actions',
					label: m.command_stop_session(),
					hint: sessionStore.elapsedLabel,
					keywords: live.note,
					icon: 'stop',
					run: () => void stop()
				}
			];
		}
		const project = sessionStore.getProject(sessionStore.draftProjectId);
		return [
			{
				id: 'action:start',
				group: 'actions',
				label: m.command_start_session(),
				hint: sessionStore.draftNote.trim() || project?.name || '',
				icon: 'play_arrow',
				run: () => void startFromDraft()
			}
		];
	});

	const recentCommands = $derived.by((): Command[] => {
		const live = sessionStore.activeSession != null;
		const startable = new Set(sessionStore.projects.map((p) => p.id));
		return recentTasks(sessionStore.sessions, RECENT_TASK_LIMIT)
			.filter((task) => startable.has(task.projectId))
			.map((task) => {
				const project = sessionStore.getProject(task.projectId);
				return {
					id: `recent:${task.sessionId}`,
					group: 'recent',
					label: task.note,
					hint: live ? m.timer_stop_first() : (project?.code ?? project?.name ?? ''),
					keywords: [project?.name, project?.code, task.ticketId].filter(Boolean).join(' '),
					icon: 'play_arrow',
					disabled: live,
					run: () => void resume(task)
				};
			});
	});

	const projectCommands = $derived(
		sessionStore.allProjects.map((project): Command => ({
			id: `project:${project.id}`,
			group: 'projects',
			label: m.command_open_project({ name: project.name }),
			hint: project.isArchived ? m.projects_archived_badge() : (project.code ?? ''),
			keywords: project.code,
			icon: 'folder_managed',
			run: () => void goto(resolve(`/projects/${encodeURIComponent(project.id)}`))
		}))
	);

	const navCommands = $derived(
		NAV_ITEMS.map((item): Command => ({
			id: `nav:${item.href}`,
			group: 'navigate',
			label: m.command_go_to({ page: item.label() }),
			hint: item.href,
			icon: item.icon,
			run: () => go(item.href)
		}))
	);

	const groups = $derived(
		filterCommands(
			[...actionCommands, ...recentCommands, ...projectCommands, ...navCommands],
			query
		)
	);

	/** Options in DOM order; the active index walks this across groups. */
	const filtered = $derived(groups.flatMap((g) => g.items));

	const activeIndex = $derived(filtered.length === 0 ? 0 : Math.min(selected, filtered.length - 1));

	const activeOptionId = $derived(filtered[activeIndex] ? `cmd-option-${activeIndex}` : undefined);

	function openPalette() {
		query = '';
		selected = 0;
		commandPalette.show();
	}

	function closePalette() {
		commandPalette.hide();
		query = '';
		selected = 0;
	}

	function runCommand(cmd: Command | undefined) {
		if (!cmd || cmd.disabled) return;
		closePalette();
		cmd.run();
	}

	function runSelected() {
		runCommand(filtered[activeIndex] ?? filtered[0]);
	}

	function onGlobalKey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (commandPalette.open) closePalette();
			else openPalette();
			return;
		}
		if (!commandPalette.open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closePalette();
		}
	}

	function scrollOptionIntoView(index: number) {
		const list = listEl;
		if (!list) return;
		const option = list.querySelectorAll<HTMLElement>('[role="option"]')[index];
		if (!option) return;
		const listRect = list.getBoundingClientRect();
		const optionRect = option.getBoundingClientRect();
		// The first option of a group brings its heading along.
		const group = option.closest('[role="group"]');
		const top =
			group && group.querySelector('[role="option"]') === option
				? group.getBoundingClientRect().top
				: optionRect.top;
		if (optionRect.bottom > listRect.bottom) {
			list.scrollTop += optionRect.bottom - listRect.bottom;
		} else if (top < listRect.top) {
			list.scrollTop -= listRect.top - top;
		}
	}

	function onInputKey(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!filtered.length) return;
			const next = (activeIndex + 1) % filtered.length;
			selected = next;
			scrollOptionIntoView(next);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!filtered.length) return;
			const next = (activeIndex - 1 + filtered.length) % filtered.length;
			selected = next;
			scrollOptionIntoView(next);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			runSelected();
		}
	}

	function onQueryInput() {
		selected = 0;
		if (listEl) listEl.scrollTop = 0;
	}

	function trapOverlay(node: HTMLElement) {
		const release = trapFocus(node, { restore: false });
		const coarse = window.matchMedia('(pointer: coarse)').matches;
		const panel = node.querySelector('[role="dialog"]');
		const id = requestAnimationFrame(() => {
			if (coarse && panel instanceof HTMLElement) panel.focus();
			else inputEl?.focus();
		});
		return () => {
			cancelAnimationFrame(id);
			release();
			commandPalette.restoreFocus();
		};
	}
</script>

<svelte:window onkeydown={onGlobalKey} />

{#if open}
	<div
		{@attach trapOverlay}
		class="fixed inset-0 z-100 flex items-start justify-center overscroll-contain px-4 pt-[15vh]"
	>
		<!-- Scrim, not chrome: a full-bleed dismiss surface, so it stays a raw button. -->
		<button
			type="button"
			tabindex="-1"
			class="absolute inset-0 bg-surface-dim/80 backdrop-blur-[2px]"
			aria-label={m.command_palette_close()}
			onclick={closePalette}
		></button>
		<div
			class="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-outline-variant bg-surface-container shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={m.command_palette_aria()}
			tabindex="-1"
		>
			<div
				class="group flex items-center gap-2 border-b border-outline-variant px-3 transition-colors focus-within:border-primary focus-within:shadow-[inset_0_-1px_0_var(--color-primary)]"
			>
				<Icon
					name="search"
					size="2xl"
					class="text-on-surface-variant transition-colors group-focus-within:text-primary"
				/>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={onQueryInput}
					onkeydown={onInputKey}
					class="focus-flush w-full bg-transparent py-3 font-mono text-code-data text-on-surface placeholder:text-on-surface-variant"
					placeholder={m.command_palette_placeholder()}
					role="combobox"
					aria-expanded="true"
					aria-controls="command-listbox"
					aria-activedescendant={activeOptionId}
					aria-autocomplete="list"
					aria-label={m.command_palette_filter_aria()}
					autocomplete="off"
				/>
				<kbd
					class="hidden rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant sm:inline"
					>esc</kbd
				>
			</div>
			<!-- Options take tabindex -1 for the a11y rule; mousedown is cancelled so focus stays
			     in the combobox input (aria-activedescendant pattern). -->
			<div
				bind:this={listEl}
				class="max-h-72 overflow-y-auto py-1"
				role="listbox"
				id="command-listbox"
				aria-label={m.command_palette_aria()}
			>
				{#if filtered.length === 0}
					<p class="px-4 py-6 text-center text-body-sm text-on-surface-variant">
						{m.command_palette_no_matches()}
					</p>
				{:else}
					{#each groups as group (group.id)}
						{const headingId = $derived(`cmd-group-${group.id}`)}
						<div role="group" aria-labelledby={headingId}>
							<div
								id={headingId}
								class="px-4 pt-2 pb-1 font-mono text-[10px] tracking-wider text-on-surface-variant uppercase"
							>
								{GROUP_LABEL[group.id]()}
							</div>
							{#each group.items as cmd (cmd.id)}
								{const i = $derived(filtered.indexOf(cmd))}
								{const active = $derived(i === activeIndex)}
								{const ink = $derived(
									cmd.disabled
										? 'cursor-not-allowed text-on-surface-variant'
										: active
											? 'cursor-pointer text-primary'
											: 'cursor-pointer text-on-surface'
								)}
								<div
									id={`cmd-option-${i}`}
									role="option"
									tabindex="-1"
									aria-selected={active}
									aria-disabled={cmd.disabled || undefined}
									class="flex items-center gap-3 px-4 py-2.5 text-left transition-colors {ink} {active
										? 'bg-surface-container-high'
										: 'hover:bg-surface-variant'}"
									onmouseenter={() => (selected = i)}
									onmousedown={(e) => e.preventDefault()}
									onclick={() => runCommand(cmd)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											runCommand(cmd);
										}
									}}
								>
									<Icon name={cmd.icon} size="lg" />
									<bdi class="min-w-0 flex-1 truncate text-body-md">{cmd.label}</bdi>
									{#if cmd.hint}
										<bdi
											class="max-w-[45%] shrink-0 truncate font-mono text-code-label text-on-surface-variant"
											>{cmd.hint}</bdi
										>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
			<div
				class="border-t border-outline-variant px-3 py-2 font-mono text-[10px] text-on-surface-variant"
			>
				{m.command_palette_hints()}
			</div>
		</div>
	</div>
{/if}
