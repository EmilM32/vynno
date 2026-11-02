# Forms

`Field`, `Input`, `Select`, `SwatchPicker` in `src/lib/components/ui/`. A raw `<input>` or `<select>` fails `primitives.guard.test.ts` unless allowlisted with a reason.

**What does not exist:** there is no `Textarea`, `Checkbox`, `Radio`, `Toggle`/`Switch`, `Combobox` or `DatePicker` primitive, and no textarea anywhere in the app. Do not build a look-alike out of buttons. If a form needs one of these beyond the pattern below, stop and say so — it is a new primitive (with a story and a guard entry), not a one-off.

**An on/off setting** is the one exception, and it has an existing pattern: a native `<input type="checkbox" role="switch">` inside a `Field layout="split"` (`SettingsView`, desktop notifications). `Field`'s `<label for>` labels it. Never fake a switch with two `tab` buttons — it is one boolean, not a choice between views. The raw input needs its file in `RAW_FIELD_ALLOWLIST`.

```svelte
<!-- src/lib/components/settings/SettingsView.svelte -->
<Field id="desktop-notifications" label={m.settings_notifications()} {hint} layout="split">
	<input
		id="desktop-notifications"
		type="checkbox"
		role="switch"
		class="size-4 rounded border-outline-variant pointer-coarse:size-6"
		checked={on}
		disabled={unavailable}
		onchange={onNotificationsChange}
	/>
</Field>
```

**A feature the browser cannot do** (unsupported, permission blocked): keep the control, `disabled`, and swap the `Field` hint for the reason. Never hide the row or replace it with an empty state — the user should see the setting exists.

## Field

Every `Input` / `Select` in a form sits in a `Field`. The one exception is a toolbar search box with no visible label, which takes `aria-label={m.…}` instead (`ProjectEntries`). `Field` renders the label, hint and error, and passes `id`, `aria-invalid` and `aria-describedby` to the control through context — so never set those on the `Input` yourself.

Layouts: `stack` (default — label above; dialogs and forms) and `split` (label left, control right on `sm`+; one-setting-per-row Settings cards). Nothing else.

```svelte
<!-- Correct — src/lib/components/projects/ProjectForm.svelte -->
<Field id="project-name" label={m.projects_field_name()} error={fieldErrors.name}>
	<Input
		type="text"
		required
		value={name}
		oninput={onNameInput}
		autocomplete="off"
		class="w-full"
	/>
</Field>

<!-- Incorrect — hand-rolled label + raw input; no aria wiring, fails the guard -->
<label for="name" class="text-body-sm">Name</label>
<input id="name" class="rounded border px-3 py-2" />
```

Optional suffix on the label ("optional") goes in the `extra` snippet in `text-on-surface-variant`. Errors go in `error` on the `Field` — never a separate `<p>` under the input.

## Input

```
What is typed into it?
 ├── Words: a name, a note, an email, a password → tone="ui" (default)
 ├── A number or duration the user reads as data (daily target, progress %) → tone="data"
 └── A code, id, or command-ish token (project code, ticket id) → tone="code"
```

Sizes: `md` (40px, default — dialogs, login, standalone forms) and `sm` (32px — `Field layout="split"` rows in Settings cards, toolbars, inline filters). Icons or adornments go in the `leading` / `trailing` snippets, which own the extra padding; never pad the input for an icon yourself.

```svelte
<!-- src/lib/components/project/ProjectEntries.svelte -->
<Input
	name="q"
	type="search"
	tone="code"
	size="sm"
	class="w-full sm:w-64"
	placeholder={m.logs_search_placeholder()}
	bind:value={query}
	aria-label={m.project_entries_search_aria()}
>
	{#snippet leading()}<Icon name="search" />{/snippet}
</Input>
```

`class` takes layout only (`w-full`, `sm:max-w-xs`, `uppercase`). Never `font-mono` — that is `tone`.

## Select

Native `<select>` with a themed chevron. Same sizes as `Input` (`sm` | `md`). Options are plain `<option>` children.

```
Is it a stored setting or a form value (theme, default project, reminder threshold)?
├── Yes → Select, whatever the number of options
└── No, it switches what the screen is showing right now (period, tab, filter)?
└── 2–4 options → `PeriodToggle` (see [buttons.md](./buttons.md)); 5+ → Select
A colour → SwatchPicker (via its domain wrapper).

```

## SwatchPicker

A radiogroup of colour swatches with arrow-key navigation. Do not use it directly in a screen — use the domain wrapper that already knows the palette:

- Project colour → `ProjectColorPicker` (`src/lib/components/projects/`)
- Activity-type colour → `ActivityColorPicker` (`src/lib/components/settings/`)

## Form layout

A form that opens in a dialog is two components: the **view owns the `Dialog`**, the form component is its content and knows nothing about the overlay. Wrap the form in `{#key}` on the edited item's id so create → edit never reuses stale state, and pass `oncancel={() => close()}`:

```svelte
<!-- src/lib/components/projects/ProjectsView.svelte -->
<Dialog open={formMode != null} title={…} onclose={closeForm} size="lg">
	{#snippet children({ close })}
		{#if formMode}
			{#key formMode.kind === 'edit' ? formMode.project.id : 'create'}
				<ProjectForm mode={formMode.kind} … onsubmit={onFormSubmit} oncancel={() => close()} />
			{/key}
		{/if}
	{/snippet}
</Dialog>
```

- Fields: `<form class="flex flex-col gap-4" novalidate>`.
- Actions: the last child, `<div class="dialog-actions mt-1 flex flex-wrap justify-end gap-2">`, Cancel (`secondary`) then submit (`primary`). Inside a `Dialog`, `dialog-actions` makes the row sticky and full-width on phones — always use that class name for a dialog's action row.
- Submit is a `Button type="submit"`, disabled while pending. Never disable it for invalid input — validate on submit and show the errors.
- Submit variant: `primary` in a dialog or a standalone form. In a Settings card, where the fields auto-show their current value, the Save button is `tonal` and rendered only while the form is dirty (`SettingsView` profile, `SecuritySection`).
- A field's own error → `Field error`. A failed submit (the server said no) → `<p class="text-body-sm text-error" role="alert">` directly above the action row, inside the form (`SecuritySection`). `Banner` is only for screen-level store errors — see [display.md](./display.md).
- A successful save → `<p class="text-body-sm text-primary" role="status">` beside the submit button, cleared on the next edit.

## Focus

Fields get the on-border focus treatment from `src/routes/layout.css` (border + 1px ring in `primary`). Do not add `.focus-ring`, `outline-*` or `ring-*` to a field. On a coarse pointer, fields are forced to ≥16px font so iOS does not zoom.

```

```
