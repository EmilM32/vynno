<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PeriodToggle from '$lib/components/insights/PeriodToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ColorDot from '$lib/components/ui/ColorDot.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import OverlayCanvas from './OverlayCanvas.svelte';

	const DOCS = 'https://github.com/EmilM32/vynno/blob/main/docs/design-system';

	/**
	 * Composed recipes, not components (ADR-0018): copy the markup, change only the layout.
	 * Each story mirrors a real call site named in its description.
	 */
	const { Story } = defineMeta({
		title: 'Patterns',
		parameters: {
			docs: {
				description: {
					component: `Recipes that are composed in place rather than extracted — the padding and header splits differ per screen. Copy the markup, change only the layout. Recipes: [layout.md](${DOCS}/layout.md), [forms.md](${DOCS}/forms.md).`
				}
			}
		}
	});
</script>

<script lang="ts">
	let period = $state<'week' | 'month' | 'year'>('week');
	let name = $state('vynno-api');
</script>

<Story
	name="Card"
	parameters={{
		docs: { description: { story: 'Card on the page. `SettingsView`, `ActiveProjects`.' } }
	}}
>
	{#snippet template()}
		<section class="rounded-lg border border-outline-variant bg-surface-container p-4">
			<h2 class="text-headline-md text-on-surface">Active projects</h2>
			<p class="mt-1 text-body-sm text-on-surface-variant">Logged this week.</p>
		</section>
	{/snippet}
</Story>

<Story
	name="List row"
	parameters={{
		docs: {
			description: {
				story:
					'Hoverable row in a list (`LogRow`). Raw markup, not a Button; no `.press`. Actions are `Button size="xs"` / `IconButton size="sm"`.'
			}
		}
	}}
>
	{#snippet template()}
		<ul class="flex flex-col gap-2">
			{#each ['Wire session hydrate', 'Review PR #21'] as note (note)}
				<li
					class="group flex min-w-0 items-center gap-3 rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container"
				>
					<ColorDot color="#3b82f6" />
					<div class="flex min-w-0 flex-1 flex-col">
						<span class="truncate text-body-md text-on-surface">{note}</span>
						<span class="truncate text-body-sm text-on-surface-variant">vynno</span>
					</div>
					<span class="font-mono text-code-data text-on-surface tabular-nums">1h 42m</span>
					<IconButton icon="play_arrow" label="Restart {note}" size="sm" />
					<Button size="xs">Edit</Button>
					<Button variant="danger" size="xs">Delete</Button>
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<Story
	name="Empty state"
	parameters={{
		docs: {
			description: {
				story:
					'Every list has one: a line saying what is missing and one `link` button that fixes it (`ProjectsView`). No illustration.'
			}
		}
	}}
>
	{#snippet template()}
		<div
			class="rounded-lg border border-dashed border-outline-variant bg-surface-container/40 px-4 py-10 text-center"
		>
			<p class="text-body-md text-on-surface-variant">No active projects yet.</p>
			<Button variant="link" size="xs" class="mt-3">Create one</Button>
		</div>
	{/snippet}
</Story>

<Story
	name="Settings section"
	parameters={{
		docs: {
			description: {
				story:
					'Settings card: split `Field` rows at `size="sm"`, Save is `tonal` and only shown while dirty, a `role="status"` line confirms, a destructive action ends the card under a divider (`SettingsView`).'
			}
		}
	}}
>
	{#snippet template()}
		<section
			class="rounded-lg border border-outline-variant bg-surface-container p-4"
			aria-labelledby="pattern-profile"
		>
			<h2 id="pattern-profile" class="text-headline-md text-on-surface">Profile</h2>
			<p class="mt-1 text-body-sm text-on-surface-variant">Shown in the sidebar.</p>
			<form class="mt-4 flex flex-col gap-5" onsubmit={(e) => e.preventDefault()}>
				<Field id="pattern-name" label="Display name" layout="split">
					<Input size="sm" bind:value={name} class="w-full sm:w-56" />
				</Field>
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<Button variant="tonal" type="submit">Save profile</Button>
					<p class="text-body-sm text-primary" role="status">Saved.</p>
				</div>
			</form>
			<div class="mt-6 border-t border-outline-variant pt-4">
				<Button variant="danger">Log out</Button>
			</div>
		</section>
	{/snippet}
</Story>

<Story
	name="Segmented control"
	parameters={{
		docs: {
			description: {
				story:
					'Re-scopes the same data (period, layout): use `PeriodToggle` — `role="group"` + `aria-pressed`, `fill` for full width on phones. For switching between panels of different content, use APG tabs as in `ProjectsView`.'
			}
		}
	}}
>
	{#snippet template()}
		<PeriodToggle
			bind:value={period}
			options={[
				{ id: 'week', label: 'Week' },
				{ id: 'month', label: 'Month' },
				{ id: 'year', label: 'Year' }
			]}
			ariaLabel="Period"
			fill
		/>
	{/snippet}
</Story>

<Story
	name="Form in dialog"
	parameters={{
		layout: 'fullscreen',
		docs: {
			story: { inline: false, iframeHeight: 520 },
			description: {
				story:
					'The view owns the `Dialog`; the form is its content. Fields in `gap-4`, action row with class `dialog-actions` (sticky, full-width on phones), Cancel then the `primary` submit (`ProjectsView` + `ProjectForm`).'
			}
		}
	}}
>
	{#snippet template()}
		<OverlayCanvas initialOpen triggerLabel="New project">
			{#snippet children({ open, close })}
				<Dialog {open} title="New project" onclose={close}>
					{#snippet children({ close })}
						<form
							class="flex flex-col gap-4"
							novalidate
							onsubmit={(e) => {
								e.preventDefault();
								close();
							}}
						>
							<Field id="pattern-project-name" label="Name">
								<Input class="w-full" />
							</Field>
							<Field id="pattern-project-code" label="Code" hint="Up to 8 characters.">
								<Input tone="code" class="w-full uppercase sm:max-w-xs" />
							</Field>
							<div class="dialog-actions mt-1 flex flex-wrap justify-end gap-2">
								<Button variant="secondary" onclick={() => close()}>Cancel</Button>
								<Button variant="primary" type="submit">Create project</Button>
							</div>
						</form>
					{/snippet}
				</Dialog>
			{/snippet}
		</OverlayCanvas>
	{/snippet}
</Story>
