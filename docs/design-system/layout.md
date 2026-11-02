# Layout, spacing, shape, elevation

## Spacing

The unit is 4px — Tailwind's default scale. Use these steps, nothing in between:

| Gap between…                                                                   | Utility                                                               |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Icon and its label, tight inline items                                         | `gap-1` / `gap-1.5`                                                   |
| Items in a row, list items, buttons in a group                                 | `gap-2` (the default)                                                 |
| Fields in a form, cards in a grid (`gap-gutter` = `gap-3`, used for KPI grids) | `gap-3` / `gap-4`                                                     |
| `Field layout="split"` rows in a Settings card, filter groups in a dialog      | `gap-5`                                                               |
| Sections of a screen                                                           | `gap-6`; `gap-8` on Settings and Timer, whose sections are tall cards |

Card padding is `p-4` (dense) or `p-6` (a chart or a hero card). Row padding is `p-3` or `px-3 py-2`. Never `p-5` on a card — `p-5` belongs to `Dialog`'s panel.

The app shell owns the page margins (`px-margin-mobile` 16px, `md:px-margin-desktop` 24px, in `AppShell.svelte`). A screen never adds its own horizontal page padding — it would double up. From `md` up, the main column is the full width beside the sidebar: a screen may cap its width below `md` (`mx-auto max-w-2xl … md:mx-0 md:max-w-none`, see `ProjectsView`) but never at desktop width.

Prefer density. A screen should show more rows, not more whitespace; regions are separated by a 1px hairline, not by 48px of empty space.

## Radius

| Element                                  | Utility           | Size |
| ---------------------------------------- | ----------------- | ---- |
| Card, panel, empty state                 | `rounded-lg`      | 8px  |
| Row, tile, inner well, control           | `rounded-DEFAULT` | 4px  |
| `ActivityChip`, near-square tag          | `rounded-sm`      | 2px  |
| Dots, avatars                            | `rounded-full`    | —    |
| Bottom sheet top edge (`Drawer` owns it) | `rounded-t-xl`    | 12px |

`rounded` and `rounded-DEFAULT` both compile to 4px; write `rounded-DEFAULT` in new code. Never `rounded-full` on a status chip or button — pills read as consumer UI, not as a terminal.

## Elevation

Flat. Depth is a lighter surface plus a 1px border, never a shadow.

| Level | Treatment                                                         |
| ----- | ----------------------------------------------------------------- |
| 0     | Page — `bg-surface` (already on `<body>`)                         |
| 1     | Card — `bg-surface-container border border-outline-variant`       |
| 2     | Overlay — `Dialog` / `Drawer` / `CommandPalette` own their shadow |

`shadow-*` appears only inside overlay primitives. Never add one to a card, row or button. An active element changes its border to `border-primary` — it does not lift.

## Recipes

These are composed in place, not extracted ([ADR-0018](../adr/0018-atomic-ui-layer.md)): padding and header splits vary too much to own. Copy the recipe, then change only the layout.

**Card**

```svelte
<!-- src/lib/components/settings/SettingsView.svelte -->
<section class="rounded-lg border border-outline-variant bg-surface-container p-4">
```

**Settings section card** — `<section class="rounded-lg border border-outline-variant bg-surface-container p-4" aria-labelledby=…>`, an `<h2 class="text-headline-md text-on-surface">`, a `text-body-sm text-on-surface-variant` subtitle, then the form. A destructive action that ends the card (Log out, Reset) goes last, after a `mt-6 border-t border-outline-variant pt-4` divider (`SettingsView`).

**List row** (a hoverable item in a list)

```svelte
<!-- src/lib/components/logs/LogRow.svelte -->
<div class="group flex min-w-0 flex-col gap-2 rounded-DEFAULT border border-outline-variant
            bg-surface-container-low p-3 transition-colors hover:border-outline hover:bg-surface-container">
```

A list row is raw markup, not a `Button`. Its actions inside are `Button size="xs"` / `IconButton size="sm"`. Never put `.press` on a row ([motion.md](../motion.md)).

**Empty state**

```svelte
<!-- src/lib/components/projects/ProjectsView.svelte -->
<div
	class="rounded-lg border border-dashed border-outline-variant bg-surface-container/40 px-4 py-10 text-center"
>
	<p class="text-body-md text-on-surface-variant">{m.projects_empty_active()}</p>
	<Button variant="link" size="xs" class="mt-3" onclick={openCreate}
		>{m.projects_create_one()}</Button
	>
</div>
```

Every list has an empty state: one line saying what is missing, one `link` button that fixes it. Never a blank region, never an illustration.

```svelte
<!-- Incorrect — shadow + pill + off-scale padding on a card -->
<div class="rounded-2xl bg-surface-container p-8 shadow-lg">
```

**Loading** — no spinners or skeletons exist. A screen that loads more shows one line, `<p class="text-body-sm text-on-surface-variant" role="status">` (`LogsView`, `ProjectView`). Keep the previous content on screen while refetching.

## Breakpoints

Tailwind defaults. `md` (768px) swaps the bottom nav for the side nav. Dialogs become bottom sheets below 40rem (640px) — `Dialog` decides, not you. Hover-only affordances use the `can-hover:` variant (`src/routes/layout.css`), never bare `hover:` to _reveal_ a control, because touch has no hover and the control would stay hidden.
