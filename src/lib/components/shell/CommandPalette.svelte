<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { NAV_ITEMS, type AppRoute } from './nav';

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
			...navCmds
		];
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return commands;
		return commands.filter(
			(c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
		);
	});

	const activeIndex = $derived(
		filtered.length === 0 ? 0 : Math.min(selected, filtered.length - 1)
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

	// Focus search when dialog opens (DOM side effect only)
	$effect(() => {
		if (!open) return;
		const id = requestAnimationFrame(() => inputEl?.focus());
		return () => cancelAnimationFrame(id);
	});
</script>

<svelte:window onkeydown={onGlobalKey} />

{#if open}
	<div class="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]">
		<button
			type="button"
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
			<div class="flex items-center gap-2 border-b border-outline-variant px-3">
				<span class="material-symbols-outlined text-on-surface-variant" aria-hidden="true"
					>search</span
				>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={onQueryInput}
					onkeydown={onInputKey}
					class="focus-ring w-full bg-transparent py-3 font-mono text-code-data text-on-surface outline-none placeholder:text-outline"
					placeholder={m.command_palette_placeholder()}
					aria-label={m.command_palette_filter_aria()}
					autocomplete="off"
				/>
				<kbd
					class="hidden rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px] text-outline sm:inline"
					>esc</kbd
				>
			</div>
			<ul class="max-h-72 overflow-y-auto py-1" role="listbox">
				{#if filtered.length === 0}
					<li class="px-4 py-6 text-center text-body-sm text-on-surface-variant">
						{m.command_palette_no_matches()}
					</li>
				{:else}
					{#each filtered as cmd, i (cmd.id)}
						<li role="option" aria-selected={i === activeIndex}>
							<button
								type="button"
								class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors {i ===
								activeIndex
									? 'bg-surface-container-high text-primary'
									: 'text-on-surface hover:bg-surface-variant'}"
								onmouseenter={() => (selected = i)}
								onclick={() => {
									closePalette();
									cmd.run();
								}}
							>
								<span class="material-symbols-outlined text-[20px]" aria-hidden="true"
									>{cmd.icon}</span
								>
								<span class="flex-1 text-body-md">{cmd.label}</span>
								<span class="font-mono text-code-label text-outline">{cmd.hint}</span>
							</button>
						</li>
					{/each}
				{/if}
			</ul>
			<div class="border-t border-outline-variant px-3 py-2 font-mono text-[10px] text-outline">
				{m.command_palette_hints()}
			</div>
		</div>
	</div>
{/if}
