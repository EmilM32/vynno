# Buttons and icons

`src/lib/components/ui/Button.svelte`, `IconButton.svelte`, `Icon.svelte`. Decision: [ADR-0017](../adr/0017-ui-primitives.md).

## Which component?

```
Does the control have a visible text label?
 ├── Yes → Button   (with href → renders <a>; use that for navigation that should look like a button)
 └── No, icon only → IconButton  (label is required — it becomes aria-label)

Is it a decorative or status glyph, not clickable?
 └── Icon

Is it a whole list row, a nav link, a colour swatch, or a scrim?
 └── None of these. Raw markup, allowlisted in primitives.guard.test.ts with a reason.
```

Never write `<button>` or `<span class="material-symbols-outlined">`. The guard test fails the build.

## Button

Variants: `primary`, `secondary`, `tonal`, `danger`, `danger-filled`, `neutral`, `quiet`, `inline`, `link`, `tab`. Nothing else exists — `ghost`, `outline`, `destructive`, `text` are not variants. Default: **`secondary`**.

- `primary` — the one main action of the screen or dialog: Start, Create, Save in a dialog. (Save inside a Settings card is `tonal` — see below.) **One per view.** Two primaries means the screen has no hierarchy. A dialog is its own view: its submit is `primary` even though the screen behind it has one too.
- `secondary` — everything else: Cancel, Edit, row actions, filter buttons. The workhorse; when unsure, this.
- `tonal` — an accented action that is not the main one: a Save that only appears once a field is dirty in Settings, and a filter that is currently constraining the list (`variant={constrained ? 'tonal' : 'secondary'}`).
- `danger` — a destructive action that opens a confirmation or is easily redone: Delete in a row, Log out.
- `danger-filled` — the final destructive confirm. Only `ConfirmDialog` renders it; you get it by passing `destructive` there. Never write it yourself.
- `neutral` — solid neutral fill, reserved for a transport action beside a `primary` (Pause next to Stop). No screen uses it today; do not reach for it as a "grey primary".
- `quiet` — borderless chrome that inherits ink: the ⌘K row in `SideNav`. Colour it with `class="text-on-surface-variant hover:text-primary"`.
- `inline` — underlined text inheriting ink, inside a `Banner` (Dismiss). Always `size="xs"`.
- `link` — underlined `primary` text: a call to action in copy or an empty state.
- `tab` — a segment in a strip; `selected` drives the look, ARIA stays yours. Two cases, two patterns:
  - **The strip filters or re-scopes the same data** (this week / last week, list / grouped, period presets) → do not hand-build it: use `PeriodToggle` (`src/lib/components/insights/PeriodToggle.svelte`; `role="group"` + `aria-pressed`, `fill` for full width on phones). Used by Logs, Insights, Project. Despite the folder, it is the shared segmented control.
  - **The strip swaps between panels of different content** (Projects: Active / Archived) → APG tabs, `role="tab" aria-selected aria-controls` with roving `tabindex`, as in `ProjectsView`.

```
Is it inside a tab strip / segmented control?
 ├── Yes → tab
 └── No
      Is it the single most important action in this view?
       ├── Yes → primary
       └── No
            Is it destructive?
             ├── Final confirm in a dialog → ConfirmDialog destructive (danger-filled)
             ├── Anything else destructive → danger
             └── No
                  Is it text inside a sentence or banner?
                   ├── In a Banner → inline
                   ├── In copy / an empty state → link
                   └── No
                        Does it reflect an active state, or need accent without being main?
                         ├── Yes → tonal
                         └── Default → secondary
```

**Sizes:** `xs` (24px — row actions, banner dismiss), `sm` (32px — compact forms, tabs, toolbars), `md` (40px — default: forms, dialogs, CTAs), `lg` (40px, `headline-md` text — the timer transport only).

```svelte
<!-- Correct — src/lib/components/projects/ProjectForm.svelte -->
<div class="dialog-actions mt-1 flex flex-wrap justify-end gap-2">
	<Button variant="secondary" onclick={oncancel}>{m.common_cancel()}</Button>
	<Button variant="primary" type="submit" disabled={pending}>{m.projects_create()}</Button>
</div>

<!-- Incorrect — "ghost" does not exist; padding and radius in class fail the guard -->
<Button variant="ghost" class="rounded-full px-6 py-3 font-mono">Cancel</Button>
```

**The `class` prop takes layout only**: `flex-1`, `w-full`, `mt-3`, `md:hidden`, `self-start`. Banned (guard-enforced): `bg-`, `p-`/`px-`/`py-`…, `rounded`, `border`, `min-h-`, `font-`, `text-body*`/`text-code*`/`text-headline*`, `text-[`, `justify-`. Alignment goes through the `justify` prop (`center` | `start` | `between`). Colour in `class` only works on `quiet` and `inline` — other variants set their own ink and two `text-*` utilities resolve by stylesheet order.

Order in a button group: secondary first, primary last (right-most). Destructive confirms put Cancel first and focus it.

## IconButton

Variants: `ghost` (default — no border, ink on hover), `bordered` (1px border; use when it sits beside bordered `Button`s or must read as a control on its own, e.g. the "…" menu trigger in `ProjectRow`). Sizes: `sm` (24px — in rows and toolbars; the most used), `md` (40px, default — mobile chrome). `selected` swaps ink to `primary` for a toggled state; `fill` fills the glyph.

```svelte
<!-- Correct — src/lib/components/logs/LogRow.svelte -->
<IconButton
	icon="play_arrow"
	label={m.logs_restart_aria({ note: session.note })}
	size="sm"
	onclick={() => void restart()}
/>

<!-- Incorrect — no label, so a screen reader announces nothing; Icon inside Button is not an icon button -->
<Button><Icon name="play_arrow" /></Button>
```

`IconButton` has no `.press` scale on purpose ([motion.md](../motion.md)). On touch, both `Button` and `IconButton` grow an invisible 40px hit area — never pad them up yourself.

## Icon

Material Symbols Outlined, **self-hosted as a subset**. Only names listed in `ICON_NAMES` in `scripts/fetch-fonts` render; any other name shows as literal text ("FOLDER"). Before using a new name, check it is in that list; if not, add it and re-run `scripts/fetch-fonts`. `icons.guard.test.ts` catches literal names that are missing.

Sizes: `xs` 14, `sm` 16, `md` 18 (default), `lg` 20, `xl` 22, `2xl` 24 (px). Never `text-[Npx]` on an icon. `fill` for active nav items and transport glyphs. Icons are `aria-hidden` by default; pass `hidden={false}` only when the icon is the sole carrier of meaning and has its own label.
