<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { trapFocus } from '$lib/a11y/focus-trap';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { NAV_ITEMS, type AppRoute } from './nav';

	const sessionStore = useSession();

	type Command = {
		id: string;
		label: string;
		hint: string;
		icon: string;
		run: () => void;
	};

	let query = $state('');
	let selected = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();
	let overlayEl: HTMLElement | undefined = $state();

	const open = $derived(commandPalette.open);

	const commands = $derived.by((): Command[] => {
		const navCmds: Command[] = NAV_ITEMS.map((item) => ({
			id: item.href,
			label: m.command_go_to({ page: item.label() }),
			hint: item.href,
			icon: item.icon,
			run: () => {
				void goto(resolve(item.href as AppRoute));
			}
		}));

		const projectCmds: Command[] = sessionStore.projects.map((p) => ({
			id: `project-${p.id}`,
			label: m.command_open_project({ name: p.name }),
			hint: p.code ?? `/projects/${p.id}`,
			icon: 'folder_open',
			run: () => {
				void goto(resolve(`/projects/${encodeURIComponent(p.id)}`));
			}
		}));

		return [
			{
				id: 'start',
				label: m.command_start_session(),
				hint: '/timer',
				icon: 'play_arrow',
				run: () => {
					void goto(resolve('/timer'));
				}
			},
			...navCmds,
			...projectCmds
		];
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return commands;
		return commands.filter(
			(c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
		);
	});

	const activeIndex = $derived(filtered.length === 0 ? 0 : Math.min(selected, filtered.length - 1));

	const activeOptionId = $derived(
		filtered[activeIndex] ? `cmd-option-${filtered[activeIndex].id.replace(/\W/g, '-')}` : undefined
	);

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

	function runSelected() {
		const cmd = filtered[activeIndex] ?? filtered[0];
		if (!cmd) return;
		closePalette();
		cmd.run();
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

	function onInputKey(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!filtered.length) return;
			selected = (activeIndex + 1) % filtered.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (!filtered.length) return;
			selected = (activeIndex - 1 + filtered.length) % filtered.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			runSelected();
		}
	}

	function onQueryInput() {
		selected = 0;
	}

	$effect(() => {
		if (!open || !overlayEl) return;
		const release = trapFocus(overlayEl, { restore: false });
		const id = requestAnimationFrame(() => inputEl?.focus());
		return () => {
			cancelAnimationFrame(id);
			release();
			commandPalette.restoreFocus();
		};
	});
</script>

<svelte:window onkeydown={onGlobalKey} />

{#if open}
	<div
		bind:this={overlayEl}
		class="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]"
	>
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
		>
			<div
				class="group flex items-center gap-2 border-b border-outline-variant px-3 transition-colors focus-within:border-primary focus-within:shadow-[inset_0_-1px_0_var(--color-primary)]"
			>
				<span
					class="material-symbols-outlined text-on-surface-variant transition-colors group-focus-within:text-primary"
					aria-hidden="true">search</span
				>
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
			<ul class="max-h-72 overflow-y-auto py-1" role="listbox" id="command-listbox">
				{#if filtered.length === 0}
					<li class="px-4 py-6 text-center text-body-sm text-on-surface-variant">
						{m.command_palette_no_matches()}
					</li>
				{:else}
					{#each filtered as cmd, i (cmd.id)}
						{const optionId = $derived(`cmd-option-${cmd.id.replace(/\W/g, '-')}`)}
						<li
							id={optionId}
							role="option"
							aria-selected={i === activeIndex}
							class="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors {i ===
							activeIndex
								? 'bg-surface-container-high text-primary'
								: 'text-on-surface hover:bg-surface-variant'}"
							onmouseenter={() => (selected = i)}
							onclick={() => {
								closePalette();
								cmd.run();
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									closePalette();
									cmd.run();
								}
							}}
						>
							<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
								>{cmd.icon}</span
							>
							<span class="flex-1 text-body-md">{cmd.label}</span>
							<span class="font-mono text-code-label text-on-surface-variant">{cmd.hint}</span>
						</li>
					{/each}
				{/if}
			</ul>
			<div
				class="border-t border-outline-variant px-3 py-2 font-mono text-[10px] text-on-surface-variant"
			>
				{m.command_palette_hints()}
			</div>
		</div>
	</div>
{/if}
