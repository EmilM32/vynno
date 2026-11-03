# Shell and screens

`src/lib/components/shell/`. The app shell (`AppShell`, `SideNav`, `BottomNav`, `TopBar`, `CommandPalette`) is done — a new screen plugs into it, it does not touch it.

## A new screen

Two files. The route is thin; the view holds the UI.

```svelte
<!-- src/routes/(app)/projects/+page.svelte -->
<PageTitle page={m.title_projects()} />
<ProjectsView />
```

```svelte
<!-- src/lib/components/projects/ProjectsView.svelte -->
<div
	class="mx-auto flex w-full max-w-2xl flex-col gap-3 md:mx-0 md:max-w-none md:gap-6"
	data-testid="page-view"
>
	<PageHeader
		title={m.projects_title()}
		description={m.projects_subtitle()}
		actionsClass="max-md:hidden"
	>
		{#snippet actions()}
			<Button variant="primary" class="shrink-0" onclick={openCreate}>{m.projects_new()}</Button>
		{/snippet}
	</PageHeader>

	{#if sessionStore.error}<Banner>…</Banner>{/if}

	<!-- cards / lists -->
</div>
```

- **`PageTitle`** — exactly one per route; sets `document.title` (and prepends the live clock while a session runs). Never write `<svelte:head><title>` yourself.
- **`PageHeader`** — exactly one per screen, first child of the view. A toolbar row, not a title block ([ADR-0034](../adr/0034-page-header-toolbar.md)): the `<h1>` in `text-headline-md`, then live context, then actions on the right. On desktop it pins, bleeds to the edges of `#main-content` (min 56px tall) and draws its bottom hairline only once content scrolls under it. When the row is too narrow, actions wrap to a second row; in the title row the context truncates first (full text in `title`), then the title. Never write your own `<h1>` or page title styles. Snippets: `meta` (live context in mono after the title — the dashboard's `wt., 3 lis · tydz. 45`; prefer it to a static `description` that only names what is on the screen), `actions` (the screen's primary action — at most one `primary` button), `titleExtra` (a compact mobile duplicate of the action, e.g. an `IconButton icon="add" variant="bordered" size="sm" class="md:hidden"`), `leading` (a `ColorDot` before a project title), `eyebrow` (a back link; inline before the title on desktop). `description` renders inline after the title; `showDescriptionOnMobile` keeps it on phones when it is the message, not chrome.
- **View root** — `flex flex-col gap-6` at `md`+ (`gap-3` on phones is fine), `data-testid="page-view"`.

## Errors and placeholders

| Situation                                                          | Component                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| A store error that affects the whole screen (`sessionStore.error`) | `Banner` ([display.md](./display.md))                                                                        |
| This screen's own query failed (the rest of the shell works)       | `<p class="text-body-sm text-error" role="alert">` in place of that content (`InsightsView`, `TimelineCard`) |
| The app seed failed to load (`(app)/+layout.svelte`)               | `ErrorState alert` in place of the content                                                                   |
| A route error / 404 (`+error.svelte`)                              | `ErrorState status={…}` (via `RouteErrorCard`)                                                               |
| A route that is not built yet                                      | `PagePlaceholder`                                                                                            |

`ErrorState` needs an `actions` snippet — always give the user a way out (Retry, Go to dashboard). Decision: [ADR-0019](../adr/0019-error-pages.md).

## Navigation

Nav items live in `NAV_ITEMS` in `src/lib/components/shell/nav.ts` and feed `SideNav`, `BottomNav`, `TopBar` and the command palette together. Adding a top-level screen means adding it there — never hard-code a link into one nav. Phones show five tabs (`MOBILE_TAB_ITEMS` — Settings moves to the top bar "so five tabs stay tappable"); adding a sixth phone tab is a product decision, not a nav edit. The sidebar rail rules are in [ADR-0029](../adr/0029-sidebar-rail.md).

## What is deliberately not a component

Composed in place, per [ADR-0018](../adr/0018-atomic-ui-layer.md): cards and panels (recipes in [layout.md](./layout.md)), log and project rows, the timer card, charts (LayerChart wrappers in `src/lib/components/charts/`, styled through `.vynno-chart`), and the command / quick input (`TaskInput`). Do not extract a generic `Card` or `Panel` — the padding and header splits differ on every screen.
