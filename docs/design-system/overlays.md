# Overlays and disclosure

`Dialog`, `ConfirmDialog`, `Drawer`, `Menu` + `MenuItem`, `Disclosure` in `src/lib/components/ui/`. Decision for phones: [ADR-0030](../adr/0030-mobile-drawer.md).

## Which one?

```
Is it a short list of actions on one row, behind a "…" button?
 ├── Yes → Menu + MenuItem
 └── No
      Is the user confirming one yes/no decision, with no input?
       ├── Yes → ConfirmDialog  (destructive → pass `destructive`)
       └── No
            Does the user fill in or pick something, then apply it?
             ├── Yes → Dialog  (becomes a bottom Drawer on phones automatically)
             └── No
                  Is it a section of the page that is long or rarely needed, that the user expands in place?
                   ├── Yes → Disclosure
                   └── Is it a page of its own (deep-linkable, has history)?
                        └── Yes → a route, not an overlay
```

Never use `Drawer` directly in a screen: `Dialog` already renders it below 40rem. Never stack a dialog on a dialog. `Menu` is the only popover: there is no generic popover, toast or tooltip primitive — do not hand-build one, and do not bend `Menu` into one; a transient "saved" message is a `text-body-sm text-primary` line with `role="status"` beside the button (`SecuritySection`).

## ConfirmDialog

Props: `open`, `title`, `message`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `onconfirm`, `oncancel`. With `destructive`, the confirm button is `danger-filled` and **Cancel gets focus** so Enter cannot delete. Without it, confirm is `primary` and gets focus.

```svelte
<!-- Correct — src/lib/components/projects/ProjectsView.svelte -->
<ConfirmDialog
	open={deleteTarget != null}
	title={m.projects_delete_title()}
	message={deleteTarget ? m.projects_delete_message({ name: deleteTarget.name }) : ''}
	confirmLabel={m.projects_delete()}
	destructive
	onconfirm={confirmDelete}
	oncancel={cancelDelete}
/>

<!-- Incorrect — a hand-built confirm loses the focus order, the drawer on phones, and the exit motion -->
<Dialog {open} title="Delete?" {onclose}>
	{#snippet children()}<Button variant="danger-filled" onclick={del}>Delete</Button>{/snippet}
</Dialog>
```

Every irreversible delete goes through `ConfirmDialog destructive`. Archive does not — it is undoable.

## Dialog

Props: `open`, `title`, `onclose`, `size` (`md` default | `lg` for forms with 4+ fields or two columns), `mobile` (`drawer` default | `dialog`), `describedby?`, `initialFocus?`. The `children` snippet receives `close`; call `close(fn)` to run `fn` after the exit animation instead of setting `open = false` yourself, so the panel animates out.

```svelte
<!-- src/lib/components/insights/InsightRangeDialog.svelte -->
<Dialog {open} title={m.insights_range_dialog_title()} {onclose}>
	{#snippet children({ close })}
		<form
			class="flex flex-col gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				apply(close);
			}}
		>
			…
			<div class="dialog-actions mt-1 flex flex-wrap justify-end gap-2">
				<Button variant="secondary" onclick={() => close()}>{m.common_cancel()}</Button>
				<Button variant="primary" type="submit">…</Button>
			</div>
		</form>
	{/snippet}
</Dialog>
```

The action row **must** have class `dialog-actions` — that is what keeps it sticky while the body scrolls and stretches buttons full-width on phones. A third action in that row (Clear filters) is `Button variant="quiet" class="dialog-actions-aside"` and drops to its own line on phones (see `Drawer.stories.svelte`).

`mobile="dialog"` only when the content needs the centred width on a phone (no current call site). Focus trap, Escape, scrim click and scroll lock are handled — do not add your own.

## Menu

The "…" overflow on a row: a bordered `more_horiz` `IconButton` (`sm`) and, under its right edge, a popover of `MenuItem`s. Use it to tuck secondary or risky actions away on a narrow row — the phone layout of `ProjectRow` (Archive, Delete) and the stacked `LogRow` (Delete). It holds actions only; anything the user types or picks a value in is a `Dialog`. A row that has room shows its actions as `Button`s instead.

`Menu` props: `label` (trigger and menu accessible name — `m.project_more_actions()`), `bind:open?` (closed by default; bind it only when the row reacts to it), `onopen?` (runs on every open — prefetch here), `testid?` (`data-testid` on the trigger), `class?` (layout on the root). The trigger is fixed: there is no icon, variant or alignment prop.

`MenuItem` props: `onselect`, `tone` (`neutral` default | `danger`), `disabled?`, `aria-describedby?`. It is a full-width `Button size="sm"` with `role="menuitem"` (`secondary` / `danger`).

Behaviour the primitive owns — do not re-add it: closes on an item, on Escape and on a pointer-down outside; an item and Escape (from inside the menu) put focus back on the trigger, before `onselect` runs, so a `ConfirmDialog` it opens restores focus there too; Up / Down / Home / End move between enabled items. The popover is `shadow-xl` (overlay level 2, [layout.md](./layout.md)). It is anchored with `absolute`, so a row whose next sibling stacks above it raises its action group while open (`ProjectRow` swaps `z-10` → `z-30` from `bind:open`).

```svelte
<!-- Correct — src/lib/components/projects/ProjectRow.svelte -->
<Menu
	label={m.project_more_actions()}
	bind:open={moreOpen}
	onopen={prefetch}
	testid="project-row-more"
>
	{#if !archived}
		<MenuItem
			onselect={onarchive}
			disabled={!canArchive || busy}
			aria-describedby={archiveReasonId}
		>
			{m.projects_archive()}
		</MenuItem>
	{/if}
	<MenuItem
		tone="danger"
		onselect={ondelete}
		disabled={!canDelete || busy}
		aria-describedby={deleteReasonId}
	>
		{m.projects_delete()}
	</MenuItem>
</Menu>

<!-- Incorrect — the pre-Menu LogRow: hand-built popover, its own window listeners, no focus return -->
<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />
<IconButton
	icon="more_horiz"
	aria-haspopup="menu"
	aria-expanded={moreOpen}
	onclick={() => (moreOpen = !moreOpen)}
	…
/>
{#if moreOpen}
	<div role="menu" class="absolute top-full right-0 z-20 shadow-xl …">
		<Button
			variant="danger"
			size="sm"
			class="w-full"
			role="menuitem"
			onclick={() => {
				moreOpen = false;
				ondelete();
			}}
		>
			{m.logs_delete()}
		</Button>
	</div>
{/if}
```

A `role="menu"` outside `Menu.svelte` / `MenuItem.svelte` fails `primitives.guard.test.ts`. The Timer note suggestions are a `listbox`, not a menu — focus stays in the input — and stay in `NoteSuggestions`. Decision: [ADR-0031](../adr/0031-menu-primitive.md).

## Disclosure

A heading that shows and hides the content under it. `title`, `level` (`2` default | `3`), `bind:open` (closed by default). The panel stays mounted while closed, so half-typed form state survives a toggle. Used for Settings → Security. Use it for a whole card section, not for "show more" on a row — a row expands with an `IconButton` `expand_more` / `expand_less` and `aria-expanded` (`LogRow`).
